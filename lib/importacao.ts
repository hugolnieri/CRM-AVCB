import { apenasDigitos } from "@/lib/cnpj";
import { descreverCnae, servicosParaCnae } from "@/lib/cnae";
import { normalizePhoneToE164 } from "@/lib/phone";
import type { Lead, LeadInput } from "@/types/lead";
import type { Cliente } from "@/types/cliente";
import type { TipoServico } from "@/types/servico";

/**
 * Importação de prospecção a partir dos dados abertos da Receita Federal.
 *
 * O arquivo vem de `scripts/importar-receita.mjs`. Esta camada é o que decide o
 * que entra: descarta quem já está no CRM, calcula os serviços sugeridos e
 * monta o `LeadInput`. Fica separada da tela porque é a parte que precisa estar
 * certa — importar duplicata em cima de cliente ativo é o tipo de erro que só
 * aparece semanas depois, quando alguém liga oferecendo o que a empresa já
 * comprou.
 */

/** Origem fixa, para a carteira importada ser filtrável e reversível. */
export const ORIGEM_IMPORTACAO = "Base da Receita";

export interface RegistroReceita {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  matriz: boolean;
  cnae: string;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string;
  uf: string;
  telefone: string | null;
  email: string | null;
  porte: string | null;
  capitalSocial: number;
}

export interface ArquivoProspeccao {
  geradoEm: string;
  camadas: string[];
  cnaes: string[];
  total: number;
  registros: RegistroReceita[];
}

export type MotivoDescarte = "ja_e_lead" | "ja_e_cliente" | "sem_contato" | "cnpj_invalido";

export interface Candidato {
  registro: RegistroReceita;
  /** Null = pode importar. */
  descarte: MotivoDescarte | null;
  /** Nomes dos serviços que o CNAE sugere. Vazio quando o catálogo não cobre. */
  servicosSugeridos: string[];
  /** Nome do ramo, resolvido pelo catálogo do IBGE. */
  segmento: string | null;
}

export const DESCARTE_LABELS: Record<MotivoDescarte, { label: string; ajuda: string }> = {
  ja_e_lead: { label: "Já está no funil", ajuda: "Existe um lead com este CNPJ." },
  ja_e_cliente: { label: "Já é cliente", ajuda: "Esta empresa já está no cadastro de clientes." },
  sem_contato: {
    label: "Sem telefone nem e-mail",
    ajuda: "A Receita não traz contato para esta empresa — não há como trabalhá-la.",
  },
  cnpj_invalido: { label: "CNPJ inválido", ajuda: "O registro veio com CNPJ malformado." },
};

interface Existentes {
  leads: Lead[];
  clientes: Cliente[];
  tipos: TipoServico[];
}

/**
 * Classifica cada registro do arquivo.
 *
 * Descartados **não somem da tela**: aparecem marcados com o motivo. Sumir
 * silenciosamente com 300 de 1.200 linhas deixaria quem importa sem saber se o
 * filtro funcionou ou se o arquivo estava errado.
 */
export function avaliarImportacao(
  arquivo: ArquivoProspeccao,
  { leads, clientes, tipos }: Existentes,
): Candidato[] {
  const cnpjsNoFunil = new Set(
    leads.map((l) => apenasDigitos(l.cnpj ?? "")).filter((c) => c.length === 14),
  );
  const cnpjsDeClientes = new Set(
    clientes.map((c) => apenasDigitos(c.cnpj ?? "")).filter((c) => c.length === 14),
  );

  return arquivo.registros.map((registro) => {
    const cnpj = apenasDigitos(registro.cnpj);
    const descarte = motivoDescarte(registro, cnpj, cnpjsNoFunil, cnpjsDeClientes);

    return {
      registro,
      descarte,
      servicosSugeridos: servicosParaCnae(registro.cnae, tipos).map((t) => t.nome),
      segmento: descreverCnae(registro.cnae),
    };
  });
}

function motivoDescarte(
  registro: RegistroReceita,
  cnpj: string,
  noFunil: Set<string>,
  clientes: Set<string>,
): MotivoDescarte | null {
  if (cnpj.length !== 14) return "cnpj_invalido";
  if (clientes.has(cnpj)) return "ja_e_cliente";
  if (noFunil.has(cnpj)) return "ja_e_lead";
  // Sem telefone nem e-mail não há como trabalhar o lead, e o próprio cadastro
  // manual exige um dos dois (ver lib/validacao.ts). Importar seria criar um
  // registro que o formulário do sistema recusaria.
  if (!registro.telefone && !registro.email) return "sem_contato";
  return null;
}

/** Só os que podem entrar. */
export function importaveis(candidatos: Candidato[]): Candidato[] {
  return candidatos.filter((c) => c.descarte === null);
}

/**
 * O registro vira um lead.
 *
 * `contatoNome` fica null de propósito: a Receita não traz quem atende, e
 * inventar "Responsável" seria pior que deixar vazio — o campo é obrigatório no
 * cadastro manual justamente para forçar alguém a descobrir o nome.
 */
export function paraLeadInput(
  candidato: Candidato,
  responsavelId: string | null,
): Partial<LeadInput> & { name: string } {
  const { registro, servicosSugeridos, segmento } = candidato;

  return {
    name: registro.nomeFantasia?.trim() || registro.razaoSocial,
    cnpj: apenasDigitos(registro.cnpj),
    cnae: registro.cnae,
    cnaeDescricao: segmento,
    contatoNome: null,
    phoneRaw: registro.telefone,
    phoneE164: normalizePhoneToE164(registro.telefone),
    email: registro.email,
    address: [registro.endereco, registro.bairro].filter(Boolean).join(" - ") || null,
    cidade: registro.cidade,
    uf: registro.uf,
    origem: ORIGEM_IMPORTACAO,
    interesse: null,
    possiveisServicos: servicosSugeridos.length > 0 ? servicosSugeridos : null,
    assignedUserId: responsavelId,
    valorEstimado: null,
    pipelineStage: "novo_lead",
  };
}

export interface ResumoImportacao {
  total: number;
  importaveis: number;
  porMotivo: Record<MotivoDescarte, number>;
  /** Quantos já chegam com serviço sugerido — a medida de o catálogo estar afiado. */
  comSugestao: number;
}

export function resumir(candidatos: Candidato[]): ResumoImportacao {
  const porMotivo: Record<MotivoDescarte, number> = {
    ja_e_lead: 0,
    ja_e_cliente: 0,
    sem_contato: 0,
    cnpj_invalido: 0,
  };

  for (const c of candidatos) {
    if (c.descarte) porMotivo[c.descarte] += 1;
  }

  const podem = importaveis(candidatos);
  return {
    total: candidatos.length,
    importaveis: podem.length,
    porMotivo,
    comSugestao: podem.filter((c) => c.servicosSugeridos.length > 0).length,
  };
}
