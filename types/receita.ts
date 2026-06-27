/**
 * Cleaned subset of the BrasilAPI CNPJ response that we store and show. We
 * deliberately leave out the `qsa` (sócios) block — it carries partners' personal
 * data we have no reason to persist for a prospecting CRM.
 */
export interface ReceitaData {
  razaoSocial: string | null;
  nomeFantasia: string | null;
  cnae: string | null;
  situacaoCadastral: string | null;
  dataInicioAtividade: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  consultadoEm: string;
}
