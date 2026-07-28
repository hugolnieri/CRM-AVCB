import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Envio das notificações por e-mail.
 *
 * É a única rota de servidor do projeto: a chave do provedor não pode ir para o
 * navegador, então o disparo precisa acontecer aqui. Todo o resto do app fala
 * direto com o PostgREST do Supabase.
 *
 * Sem `RESEND_API_KEY` a rota não falha — responde `sent: false` e a notificação
 * fica registrada como não enviada, visível no painel administrativo. Isso deixa
 * a funcionalidade inteira utilizável antes de existir conta de e-mail, e ligar o
 * envio depois é só definir a variável.
 *
 * Usa fetch direto na API do Resend em vez do SDK: é uma chamada só, e evita mais
 * uma dependência.
 */
export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.NOTIFICACOES_REMETENTE ?? "onboarding@resend.dev";

  let payload: { id?: string; destino?: string; titulo?: string; corpo?: string | null };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { id, destino, titulo, corpo } = payload;
  if (!id || !destino || !titulo) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
  }

  // Só quem está autenticado dispara notificação — a rota é pública por padrão.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!apiKey) {
    return NextResponse.json({ sent: false, reason: "sem_provedor" });
  }

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente,
        to: [destino],
        subject: `[SEICO] ${titulo}`,
        text: corpo ?? titulo,
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      return NextResponse.json({ sent: false, reason: detalhe }, { status: 502 });
    }

    // Marca como enviada. Roda com a sessão do usuário (RLS), não com service
    // role — a policy de UPDATE em notificacoes existe só para isto.
    await supabase.from("notificacoes").update({ enviada_em: new Date().toISOString() }).eq("id", id);

    return NextResponse.json({ sent: true });
  } catch (err) {
    return NextResponse.json(
      { sent: false, reason: err instanceof Error ? err.message : "falha de rede" },
      { status: 502 },
    );
  }
}
