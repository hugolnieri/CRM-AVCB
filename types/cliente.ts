export type ClienteStatus = "ativo" | "inativo";

/**
 * Empresa atendida. Diferente de Lead: o lead é a oportunidade comercial, o
 * cliente é o registro durável que carrega treinamentos, serviços e vencimentos.
 * `leadId` guarda a origem quando o cliente veio de uma conversão.
 */
export interface Cliente {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  telefoneE164: string | null;
  email: string | null;
  contatoNome: string | null;
  contatoCargo: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  status: ClienteStatus;
  observacoes: string | null;
  /**
   * Serviços do catálogo que fazem sentido oferecer a este cliente. Guarda os
   * nomes, não FKs — mesma razão do campo homônimo em Lead.
   */
  possiveisServicos: string[] | null;
  leadId: string | null;
  responsavelId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ClienteInput = Omit<Cliente, "id" | "createdAt" | "updatedAt">;

/** Nome curto para listas e títulos: fantasia quando existe, senão razão social. */
export function nomeCliente(cliente: Cliente): string {
  return cliente.nomeFantasia?.trim() || cliente.razaoSocial;
}
