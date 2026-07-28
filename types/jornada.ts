/**
 * Jornada de trabalho de um colaborador num dia. Marcada por ação explícita
 * (botão), não por login: o evento SIGNED_IN do Supabase dispara a cada refresh
 * de página em que a sessão é reestabelecida, então usá-lo como início de
 * jornada geraria vários registros falsos por dia.
 */
export interface RegistroDiario {
  id: string;
  memberId: string;
  /** "YYYY-MM-DD" — a jornada pertence a um dia civil, não a um instante. */
  data: string;
  inicioAt: string | null;
  fimAt: string | null;
  /** Preenchida no fechamento; é o texto que aparece no relatório. */
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Configuracoes {
  /** Destino das notificações. Null = ninguém configurou; nada é enviado. */
  emailNotificacoes: string | null;
  notificarInicioDia: boolean;
  notificarFimDia: boolean;
  notificarFechamento: boolean;
  updatedAt: string;
}

export type ConfiguracoesInput = Omit<Configuracoes, "updatedAt">;

export type NotificacaoTipo = "inicio_dia" | "fim_dia" | "fechamento";

export interface Notificacao {
  id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  corpo: string | null;
  memberId: string | null;
  emailDestino: string | null;
  /** Null = registrada mas não enviada (sem e-mail configurado ou falha). */
  enviadaEm: string | null;
  createdAt: string;
}

export const NOTIFICACAO_LABELS: Record<NotificacaoTipo, { label: string; color: string }> = {
  inicio_dia: { label: "Início de jornada", color: "blue" },
  fim_dia: { label: "Fim de jornada", color: "gray" },
  fechamento: { label: "Fechamento de cliente", color: "green" },
};
