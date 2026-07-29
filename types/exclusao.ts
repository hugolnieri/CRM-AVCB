export type EntidadeExcluivel = "lead" | "cliente";
export type SolicitacaoStatus = "pendente" | "aprovada" | "recusada";

/**
 * Pedido de exclusão de um lead ou cliente.
 *
 * Existe porque colaborador não apaga: a RLS exige `is_admin()` no DELETE das
 * duas tabelas. O pedido é o caminho — ele registra, o administrador decide.
 */
export interface SolicitacaoExclusao {
  id: string;
  entidade: EntidadeExcluivel;
  registroId: string;
  /** Nome no momento do pedido; sobrevive à exclusão do registro. */
  rotulo: string;
  motivo: string | null;
  status: SolicitacaoStatus;
  solicitadoPor: string | null;
  decididoPor: string | null;
  decididoEm: string | null;
  observacao: string | null;
  createdAt: string;
  updatedAt: string;
}

export const SOLICITACAO_STATUS_LABELS: Record<
  SolicitacaoStatus,
  { label: string; color: string }
> = {
  pendente: { label: "Aguardando administrador", color: "orange" },
  aprovada: { label: "Aprovada", color: "red" },
  recusada: { label: "Recusada", color: "gray" },
};

export const ENTIDADE_LABELS: Record<EntidadeExcluivel, string> = {
  lead: "lead",
  cliente: "cliente",
};
