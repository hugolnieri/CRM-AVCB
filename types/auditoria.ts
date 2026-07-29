export type AuditAcao = "insert" | "update" | "delete";

/**
 * Uma linha do log de auditoria. Escrita por gatilho no banco, nunca pelo app —
 * ver supabase/migrations/0009_auditoria.sql.
 */
export interface AuditEntry {
  id: number;
  tabela: string;
  registroId: string | null;
  acao: AuditAcao;
  /** Null quando a ação veio de fora de uma sessão (migração, console admin). */
  memberId: string | null;
  /** Nome do registro no momento do evento; sobrevive à exclusão dele. */
  rotulo: string | null;
  /**
   * insert/delete: a linha inteira, `{campo: valor}`.
   * update: só o que mudou, `{campo: {de, para}}`.
   */
  dados: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditFiltro {
  /** ISO; o padrão da tela são 30 dias. */
  desde: string;
  memberId?: string | null;
  tabela?: string | null;
  acao?: AuditAcao | null;
}
