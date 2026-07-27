/** Item do catálogo de treinamentos (NRs). Mantido pelo admin. */
export interface TipoTreinamento {
  id: string;
  nome: string;
  sigla: string | null;
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

export interface Treinamento {
  id: string;
  clienteId: string;
  tipoTreinamentoId: string | null;
  /**
   * Nome do tipo no momento do registro. É um snapshot de propósito: treinamentos
   * lastreiam certificados emitidos, então renomear um tipo no catálogo não pode
   * reescrever o histórico.
   */
  tipoNome: string;
  /** "YYYY-MM-DD" — coluna `date`, sem hora nem fuso. */
  dataRealizacao: string;
  dataVencimento: string | null;
  participantes: number | null;
  instrutor: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TreinamentoInput = Omit<Treinamento, "id" | "createdAt" | "updatedAt">;
