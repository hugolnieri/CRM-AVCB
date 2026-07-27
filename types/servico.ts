export interface Servico {
  id: string;
  clienteId: string;
  /**
   * Texto livre, como pedido nos requisitos. A UI alimenta um Autocomplete com
   * os valores já cadastrados, então o vocabulário converge sem tabela base.
   */
  tipo: string;
  /** "YYYY-MM-DD" — coluna `date`, sem hora nem fuso. */
  data: string;
  /** Próxima manutenção/reavaliação. Null = serviço pontual, não recorre. */
  dataProxima: string | null;
  responsavelId: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ServicoInput = Omit<Servico, "id" | "createdAt" | "updatedAt">;
