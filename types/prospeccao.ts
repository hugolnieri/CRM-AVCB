/**
 * Uma empresa levantada do dump do CNPJ, ainda não decidida.
 *
 * Não é lead: é o material bruto de onde o lead sai. A distinção importa porque
 * o funil mede trabalho comercial — encher `leads` com 3.000 empresas que
 * ninguém olhou faria toda métrica de conversão mentir.
 */
export interface Prospeccao {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  matriz: boolean;
  cnae: string;
  cnaeDescricao: string | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string;
  uf: string;
  telefone: string | null;
  email: string | null;
  /** Código da Receita: "01" micro/MEI, "03" EPP, "05" demais. */
  porte: string | null;
  capitalSocial: number | null;
  inicioAtividade: string | null;
  /** "AAAA-MM" do dump que trouxe a linha. */
  competencia: string;
  virouLeadEm: string | null;
  leadId: string | null;
  descartadaEm: string | null;
  descartadaPor: string | null;
  createdAt: string;
}

/** O nome que se usa para falar da empresa: fantasia quando existe. */
export function nomeDeExibicao(p: Prospeccao): string {
  return p.nomeFantasia?.trim() || p.razaoSocial;
}
