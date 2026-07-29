import { createClient } from "@/lib/supabase/client";
import type {
  Configuracoes,
  ConfiguracoesInput,
  Notificacao,
  NotificacaoTipo,
  RegistroDiario,
} from "@/types/jornada";

// --- registros diários ------------------------------------------------------

interface RegistroRow {
  id: string;
  member_id: string;
  data: string;
  inicio_at: string | null;
  fim_at: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToRegistro(row: RegistroRow): RegistroDiario {
  return {
    id: row.id,
    memberId: row.member_id,
    data: row.data,
    inicioAt: row.inicio_at,
    fimAt: row.fim_at,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchRegistrosDiarios(): Promise<RegistroDiario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("registros_diarios")
    .select("*")
    .order("data", { ascending: false });

  if (error) throw error;
  return (data as RegistroRow[]).map(mapRowToRegistro);
}

/** Data de hoje como "YYYY-MM-DD" local — a coluna é `date`, sem fuso. */
function hoje(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Abre a jornada do dia. A RLS exige `member_id = auth.uid()`, então ninguém bate
 * ponto por outro; e a unique (member_id, data) impede dois inícios no mesmo dia.
 */
export async function iniciarDia(): Promise<RegistroDiario> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");

  const { data, error } = await supabase
    .from("registros_diarios")
    .upsert(
      { member_id: user.id, data: hoje(), inicio_at: new Date().toISOString() },
      { onConflict: "member_id,data" },
    )
    .select()
    .single();

  if (error) throw error;
  return mapRowToRegistro(data as RegistroRow);
}

export async function finalizarDia(observacoes: string | null): Promise<RegistroDiario> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");

  // upsert e não update: permite fechar o dia mesmo se a pessoa esqueceu de
  // abrir — o relatório perde a hora de início, não o registro inteiro.
  const { data, error } = await supabase
    .from("registros_diarios")
    .upsert(
      { member_id: user.id, data: hoje(), fim_at: new Date().toISOString(), observacoes },
      { onConflict: "member_id,data" },
    )
    .select()
    .single();

  if (error) throw error;
  return mapRowToRegistro(data as RegistroRow);
}

// --- configurações ----------------------------------------------------------

interface ConfigRow {
  email_notificacoes: string | null;
  notificar_inicio_dia: boolean;
  notificar_fim_dia: boolean;
  notificar_fechamento: boolean;
  updated_at: string;
}

export async function fetchConfiguracoes(): Promise<Configuracoes> {
  const supabase = createClient();
  const { data, error } = await supabase.from("configuracoes").select("*").single();

  if (error) throw error;
  const row = data as ConfigRow;
  return {
    emailNotificacoes: row.email_notificacoes,
    notificarInicioDia: row.notificar_inicio_dia,
    notificarFimDia: row.notificar_fim_dia,
    notificarFechamento: row.notificar_fechamento,
    updatedAt: row.updated_at,
  };
}

/** Restrito a admin pela RLS. */
export async function updateConfiguracoes(patch: Partial<ConfiguracoesInput>): Promise<void> {
  const supabase = createClient();
  const row: Record<string, unknown> = {};
  if ("emailNotificacoes" in patch) row.email_notificacoes = patch.emailNotificacoes;
  if ("notificarInicioDia" in patch) row.notificar_inicio_dia = patch.notificarInicioDia;
  if ("notificarFimDia" in patch) row.notificar_fim_dia = patch.notificarFimDia;
  if ("notificarFechamento" in patch) row.notificar_fechamento = patch.notificarFechamento;

  const { error } = await supabase.from("configuracoes").update(row).eq("id", true);
  if (error) throw error;
}

// --- notificações -----------------------------------------------------------

interface NotificacaoRow {
  id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  corpo: string | null;
  member_id: string | null;
  email_destino: string | null;
  enviada_em: string | null;
  created_at: string;
}

export async function fetchNotificacoes(): Promise<Notificacao[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data as NotificacaoRow[]).map((row) => ({
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    corpo: row.corpo,
    memberId: row.member_id,
    emailDestino: row.email_destino,
    enviadaEm: row.enviada_em,
    createdAt: row.created_at,
  }));
}

export interface ResultadoEnvio {
  sent: boolean;
  /** "sem_provedor" quando falta a chave; texto cru do provedor quando ele recusa. */
  reason?: string;
}

/**
 * Envia um e-mail de teste sem registrar nada em `notificacoes`.
 *
 * Existe porque a chave do provedor é server-only: o navegador não tem como
 * saber se ela está definida, e inferir isso de "nenhuma notificação foi
 * enviada" produz diagnóstico errado — a mesma evidência aparece quando a chave
 * está certa e o provedor recusou o destinatário.
 */
export async function testarEnvio(destino: string): Promise<ResultadoEnvio> {
  const resposta = await fetch("/api/notificar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      destino,
      titulo: "Teste de configuração",
      corpo: "Se você recebeu este e-mail, as notificações do SEICO estão funcionando.",
    }),
  });

  const dados = (await resposta.json()) as ResultadoEnvio & { error?: string };
  if (dados.error) return { sent: false, reason: dados.error };
  return { sent: dados.sent === true, reason: dados.reason };
}

/**
 * Registra o evento e tenta enviar por e-mail.
 *
 * O registro na tabela vem primeiro e nunca depende do envio: sem e-mail
 * configurado (ou com o provedor fora do ar) o evento continua visível no admin.
 * O envio é best-effort — falhar não pode derrubar a ação do usuário, que já
 * aconteceu.
 */
export async function registrarNotificacao(
  tipo: NotificacaoTipo,
  titulo: string,
  corpo: string | null,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let config: Configuracoes | null = null;
  try {
    config = await fetchConfiguracoes();
  } catch {
    // Sem configuração legível, registra sem destino em vez de falhar.
  }

  const habilitado =
    tipo === "inicio_dia"
      ? config?.notificarInicioDia
      : tipo === "fim_dia"
        ? config?.notificarFimDia
        : config?.notificarFechamento;

  if (habilitado === false) return;

  const destino = config?.emailNotificacoes ?? null;
  const { data, error } = await supabase
    .from("notificacoes")
    .insert({
      tipo,
      titulo,
      corpo,
      member_id: user?.id ?? null,
      email_destino: destino,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (!destino) return;

  try {
    await fetch("/api/notificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: (data as { id: string }).id, destino, titulo, corpo }),
    });
  } catch {
    // Envio é best-effort: a notificação já está registrada e aparece no admin
    // como "não enviada".
  }
}
