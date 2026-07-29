import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Criação de acesso e redefinição de senha, feitas pelo administrador.
 *
 * É a terceira (e mais delicada) rota de servidor do projeto. Existe por um
 * motivo técnico duro: o `supabase.auth.signUp()` do navegador **troca a sessão
 * corrente pela do usuário recém-criado** — o admin cadastraria alguém e seria
 * deslogado no processo. Criar conta para outra pessoa exige a API de admin do
 * Supabase, que só aceita a service role key, e essa chave nunca pode ir para o
 * navegador: ela ignora RLS por completo.
 *
 * Por isso o arquivo é o único lugar do projeto que a toca, e a checagem de
 * permissão vem antes de qualquer uso dela. A ordem importa:
 *
 * 1. há sessão?
 * 2. essa sessão é de admin? — perguntado ao banco pela RPC `is_admin()`, com o
 *    token de quem chamou, não com a service role. Confiar num campo do corpo
 *    da requisição seria deixar o chamador declarar o próprio poder.
 * 3. só então a service role entra.
 *
 * O perfil (admin/colaborador) NÃO é definido aqui: quem faz isso é a RPC
 * `set_member_role`, chamada pelo cliente depois, que valida `is_admin()` no
 * banco. Aceitar `role` nesta rota abriria um segundo caminho para promoção,
 * e um caminho a mais é uma trava a menos.
 */

const SENHA_MINIMA = 8;

interface Payload {
  acao?: "criar" | "redefinir_senha";
  email?: string;
  senha?: string;
  fullName?: string;
  userId?: string;
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  // --- 1. sessão -----------------------------------------------------------
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // --- 2. é admin? ---------------------------------------------------------
  const { data: ehAdmin, error: erroAdmin } = await supabase.rpc("is_admin");
  if (erroAdmin || ehAdmin !== true) {
    return NextResponse.json(
      { error: "Apenas administradores podem gerenciar acessos." },
      { status: 403 },
    );
  }

  // --- 3. service role -----------------------------------------------------
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // Mesma política de /api/notificar: sem a chave a funcionalidade se
    // desliga com uma mensagem que diz o que fazer, em vez de estourar.
    return NextResponse.json(
      {
        error:
          "Falta a variável SUPABASE_SERVICE_ROLE_KEY no ambiente do projeto. Defina na Vercel e refaça o deploy.",
        motivo: "sem_service_role",
      },
      { status: 503 },
    );
  }

  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const senha = payload.senha ?? "";
  if (senha.length < SENHA_MINIMA) {
    return NextResponse.json(
      { error: `A senha precisa ter ao menos ${SENHA_MINIMA} caracteres.` },
      { status: 400 },
    );
  }

  if (payload.acao === "criar") {
    const email = (payload.email ?? "").trim().toLowerCase();
    const fullName = (payload.fullName ?? "").trim();
    if (!email || !fullName) {
      return NextResponse.json({ error: "Informe nome e e-mail." }, { status: 400 });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      // Confirmado na criação: não há SMTP configurado no Supabase, e sem isto
      // a pessoa ficaria presa esperando um e-mail que nunca chega.
      email_confirm: true,
      // Lido pelo gatilho handle_new_user para preencher team_members.full_name.
      user_metadata: { full_name: fullName },
    });

    if (error) {
      return NextResponse.json({ error: traduzirErro(error.message) }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId: data.user?.id });
  }

  if (payload.acao === "redefinir_senha") {
    const userId = payload.userId ?? "";
    if (!userId) {
      return NextResponse.json({ error: "Informe de quem é a senha." }, { status: 400 });
    }

    const { error } = await admin.auth.admin.updateUserById(userId, { password: senha });
    if (error) {
      return NextResponse.json({ error: traduzirErro(error.message) }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}

/**
 * As mensagens do GoTrue vêm em inglês. Só as previsíveis são traduzidas; o
 * resto passa cru de propósito, pela mesma razão de `lib/errors.ts` — bug novo
 * não pode virar mensagem bonitinha e sem pista.
 */
function traduzirErro(mensagem: string): string {
  if (/already been registered|already exists|duplicate/i.test(mensagem)) {
    return "Já existe um acesso com este e-mail.";
  }
  if (/valid email|invalid format/i.test(mensagem)) {
    return "E-mail inválido.";
  }
  if (/password/i.test(mensagem) && /short|least/i.test(mensagem)) {
    return `A senha precisa ter ao menos ${SENHA_MINIMA} caracteres.`;
  }
  return mensagem;
}
