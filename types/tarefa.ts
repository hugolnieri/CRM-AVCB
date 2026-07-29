export type TarefaPrioridade = "baixa" | "normal" | "alta";

/**
 * Um compromisso de alguém. Diferente de uma pendência de `lib/painel.ts`: a
 * pendência é um estado do dado e some quando o dado é corrigido; a tarefa é
 * um combinado e só some quando alguém a conclui.
 */
export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: TarefaPrioridade;
  /** "YYYY-MM-DD" — coluna `date`, sem hora nem fuso. */
  prazo: string | null;
  /** Null = tarefa da administração: sem dono, aparece para todo admin. */
  responsavelId: string | null;
  /** Null = aberta. Não há enum de status; estes dois campos são o status. */
  concluidaEm: string | null;
  concluidaPor: string | null;
  clienteId: string | null;
  leadId: string | null;
  servicoId: string | null;
  /** `Pendencia.id` quando a tarefa nasceu do botão "Delegar". */
  origemPendencia: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TarefaInput = Omit<
  Tarefa,
  "id" | "concluidaEm" | "concluidaPor" | "createdBy" | "createdAt" | "updatedAt"
>;

/**
 * Vermelho fica de fora: aqui ele significaria "urgente", e urgente já é o
 * prazo vencido — que a lista pinta sozinha. Prioridade alta é gravidade
 * declarada, não atraso.
 */
export const PRIORIDADE_LABELS: Record<TarefaPrioridade, { label: string; color: string }> = {
  alta: { label: "Alta", color: "orange" },
  normal: { label: "Normal", color: "blue" },
  baixa: { label: "Baixa", color: "gray" },
};

/** Ordem de exibição: a mais grave primeiro. */
export const PRIORIDADE_ORDEM: Record<TarefaPrioridade, number> = {
  alta: 0,
  normal: 1,
  baixa: 2,
};
