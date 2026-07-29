import { normalizeForSearch } from "@/lib/search";

/**
 * A área de atuação, em camadas concêntricas a partir de Cerquilho, onde fica a
 * sede.
 *
 * As camadas existem para a prospecção começar pequena: importar 78 municípios
 * de uma vez enche o funil de gente que ninguém vai visitar tão cedo, e o
 * primeiro lote serve para descobrir se a régua de qualificação está certa.
 *
 * Por que não usar a "região imediata" do IBGE direto: ela agrupa por polo
 * econômico, não por distância, e a de Sorocaba **exclui Tatuí e Laranjal
 * Paulista** — duas cidades que fazem divisa com Cerquilho. Para quem pega a
 * estrada, isso é o que importa.
 */

export type CamadaRegiao = "vizinhas" | "sorocaba" | "ampliada";

export interface Camada {
  id: CamadaRegiao;
  nome: string;
  descricao: string;
  /** Só as cidades que esta camada acrescenta às anteriores. */
  cidades: string[];
}

export const CAMADAS: Camada[] = [
  {
    id: "vizinhas",
    nome: "Cerquilho e vizinhas",
    descricao: "A sede e os municípios que fazem divisa. Ida e volta no mesmo dia, sem pernoite.",
    cidades: [
      "Cerquilho",
      "Tietê",
      "Jumirim",
      "Boituva",
      "Cesário Lange",
      "Laranjal Paulista",
      "Tatuí",
    ],
  },
  {
    id: "sorocaba",
    nome: "Região de Sorocaba",
    descricao: "O polo industrial da região imediata. É onde está o volume de indústria.",
    cidades: [
      "Sorocaba",
      "Votorantim",
      "Itu",
      "Salto",
      "Porto Feliz",
      "Capela do Alto",
      "Iperó",
      "Araçoiaba da Serra",
      "Alumínio",
      "Mairinque",
      "Araçariguama",
      "São Roque",
      "Salto de Pirapora",
      "Sarapuí",
    ],
  },
  {
    id: "ampliada",
    nome: "Região ampliada",
    descricao: "Mais longe: exige planejar a visita. Só vale para conta grande.",
    cidades: [
      "Itapetininga",
      "Piedade",
      "Pilar do Sul",
      "Ibiúna",
      "Conchas",
      "Pereiras",
      "Porangaba",
      "Quadra",
      "Torre de Pedra",
      "Anhembi",
      "Bofete",
      "Guareí",
      "Alambari",
      "Capão Bonito",
      "Angatuba",
      "Piracicaba",
      "Rio das Pedras",
      "Saltinho",
      "Elias Fausto",
      "Capivari",
      "Monte Mor",
      "Indaiatuba",
    ],
  },
];

/** Todas as cidades das camadas escolhidas, sem repetir. */
export function cidadesDasCamadas(camadas: CamadaRegiao[]): string[] {
  const escolhidas = new Set(camadas);
  const nomes = CAMADAS.filter((c) => escolhidas.has(c.id)).flatMap((c) => c.cidades);
  return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * Índice normalizado para casar com o nome que vem da Receita, que é em caixa
 * alta e sem acento ("SAO ROQUE", "CESARIO LANGE"). O casamento é por nome e
 * não por código de município de propósito: a Receita usa a tabela TOM, não o
 * código do IBGE, e confundir as duas é o erro clássico deste import.
 */
export function indiceNormalizado(cidades: string[]): Map<string, string> {
  return new Map(cidades.map((c) => [normalizeForSearch(c), c]));
}

/** O nome bonito da cidade, quando ela está na área de atuação. */
export function cidadeDaRegiao(nomeCru: string, cidades: string[]): string | null {
  return indiceNormalizado(cidades).get(normalizeForSearch(nomeCru.trim())) ?? null;
}

/** Todas as cidades atendidas, para o padrão da tela de importação. */
export const TODAS_AS_CIDADES = cidadesDasCamadas(["vizinhas", "sorocaba", "ampliada"]);
