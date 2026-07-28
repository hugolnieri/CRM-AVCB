/**
 * Um serviço prestado ao cliente. Treinamento normativo (NR-35) e serviço
 * técnico (laudo, manutenção) são a mesma entidade: o que os distingue é a
 * `categoria` do tipo, não a tabela.
 */
export type ServicoStatus = "agendado" | "realizado" | "cancelado";

export type CategoriaServico = "treinamento" | "servico";

/** Item do catálogo, mantido pelo admin. */
export interface TipoServico {
  id: string;
  nome: string;
  sigla: string | null;
  categoria: CategoriaServico;
  /**
   * Meses de validade a partir da realização. Null = não vence.
   * É o que permite sugerir a data de vencimento automaticamente.
   */
  validadeMeses: number | null;
  cargaHoraria: number | null;
  ativo: boolean;
  ordem: number;
  createdAt: string;
}

export interface Servico {
  id: string;
  clienteId: string;
  tipoServicoId: string | null;
  /**
   * Nome do tipo no momento do registro. Snapshot de propósito: serviços
   * lastreiam certificados emitidos, então renomear o tipo no catálogo não pode
   * reescrever o histórico.
   */
  tipoNome: string;
  status: ServicoStatus;
  /** Compromisso marcado — ISO com hora (coluna timestamptz). */
  dataAgendada: string | null;
  /** Fato consumado — "YYYY-MM-DD" (coluna date, sem hora nem fuso). */
  dataRealizacao: string | null;
  dataVencimento: string | null;
  participantes: number | null;
  instrutor: string | null;
  responsavelId: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ServicoInput = Omit<Servico, "id" | "createdAt" | "updatedAt">;

export const SERVICO_STATUS_LABELS: Record<ServicoStatus, { label: string; color: string }> = {
  agendado: { label: "Agendado", color: "blue" },
  realizado: { label: "Realizado", color: "green" },
  cancelado: { label: "Cancelado", color: "gray" },
};

export const CATEGORIA_LABELS: Record<CategoriaServico, string> = {
  treinamento: "Treinamento",
  servico: "Serviço",
};

/** Rótulo do catálogo: "NR-35 — Trabalho em Altura". */
export function rotuloTipo(tipo: TipoServico): string {
  return tipo.sigla ? `${tipo.sigla} — ${tipo.nome}` : tipo.nome;
}
