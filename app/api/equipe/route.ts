import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Criação de acesso, redefinição de senha e ativação/desativação, feitas pelo
 * administrador.
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
 *
 * Desativar, ao contrário, é justamente o que precisa da service role: barrar
 * alguém é banir o usuário no Auth, e `team_members.ativo` é só o espelho
 * legível disso — ver `definirAtivo` abaixo.
 */

const SENHA_MINIMA = 8;

/** ~100 anos. O GoTrue não tem "para sempre"; tem duração, e "none" desfaz. */
const BAN_INDEFINIDO = "876000h";

interface Payload {
  acao?: "criar" | "redefinir_senha" | "definir_ativo";
  email?: string;
  senha?: string;
  fullName?: string;
  userId?: string;
  ativo?: boolean;
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

  // A senha é exigência das duas ações que a usam, e não da rota: `definir_ativo`
  // não tem senha nenhuma para conferir.
  const senha = payload.senha ?? "";
  const senhaCurta = senha.length < SENHA_MINIMA;
  const erroSenha = NextResponse.json(
    { error: `A senha precisa ter ao menos ${SENHA_MINIMA} caracteres.` },
    { status: 400 },
  );

  if (payload.acao === "criar") {
    if (senhaCurta) return erroSenha;

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
    if (senhaCurta) return erroSenha;

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

  if (payload.acao === "definir_ativo") {
    const userId = payload.userId ?? "";
    const ativo = payload.ativo === true;
    if (!userId) {
      return NextResponse.json({ error: "Informe de quem é o acesso." }, { status: 400 });
    }

    // Mesma trava de `set_member_role`: sem ela o único administrador se
    // desativa e tranca a equipe inteira do lado de fora, sem caminho de volta
    // pela aplicação.
    if (userId === user.id && !ativo) {
      return NextResponse.json(
        { error: "Você não pode desativar o próprio acesso." },
        { status: 400 },
      );
    }

    // O ban é a barreira; a coluna é o espelho. Por isso o ban vem primeiro:
    // falhar entre os dois passos deixa alguém barrado que a tela ainda mostra
    // como ativo — visível e corrigível com um segundo clique. A ordem inversa
    // deixaria a tela dizendo "Inativo" para quem continua entrando, que é a
    // mentira perigosa. (Mesmo raciocínio de `aprovarExclusao`.)
    const { error: erroBan } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: ativo ? "none" : BAN_INDEFINIDO,
    });
    if (erroBan) {
      return NextResponse.json({ error: traduzirErro(erroBan.message) }, { status: 400 });
    }

    // A coluna vai pela RPC, com o token de quem clicou, e NÃO pela service role
    // que já está aqui do lado: o gatilho `registrar_audit` grava `auth.uid()`,
    // e escrita de service role deixaria o log dizendo que ninguém desativou
    // ninguém. A RPC revalida `is_admin()` no banco, então nada é afrouxado.
    const { error: erroFlag } = await supabase.rpc("set_member_ativo", {
      target: userId,
      novo: ativo,
    });
    if (erroFlag) {
      return NextResponse.json({ error: traduzirErro(erroFlag.message) }, { status: 400 });
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
