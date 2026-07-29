import { normalizeForSearch } from "@/lib/search";
import { PIPELINE_STAGE_COLORS, PIPELINE_STAGE_ORDEM } from "@/lib/pipeline/stages";
import type { Lead, PipelineStage } from "@/types/lead";

export interface GrupoCidade {
  /** Identidade normalizada: "sorocaba|sp". É por ela que se casa com o cache. */
  chave: string;
  /** Como aparece na tela — a primeira grafia encontrada, com acento e caixa. */
  nome: string;
  uf: string;
  total: number;
  /** Soma de `valorEstimado`; leads sem valor somam zero. */
  valor: number;
  leads: Lead[];
  /** Etapa mais avançada do funil presente na cidade — dá a cor da bolha. */
  etapaPredominante: PipelineStage;
}

/**
 * Chave de identidade de uma cidade. Sem isto "São Paulo", "sao paulo" e
 * "SÃO PAULO " viram três cidades no mapa — `cidade` é texto livre digitado à
 * mão, então isso acontece já na primeira semana de uso.
 */
export function chaveCidade(cidade: string, uf: string | null): string {
  return `${normalizeForSearch(cidade.trim())}|${normalizeForSearch((uf ?? "").trim())}`;
}

/**
 * Agrupa os leads por cidade.
 *
 * Lead sem cidade preenchida não entra em grupo nenhum e sai em
 * `semCidade` — some do mapa mas não do sistema, que é a diferença entre um
 * mapa e um filtro.
 */
export function agruparPorCidade(leads: Lead[]): {
  grupos: GrupoCidade[];
  semCidade: Lead[];
} {
  const mapa = new Map<string, GrupoCidade>();
  const semCidade: Lead[] = [];

  for (const lead of leads) {
    const cidade = lead.cidade?.trim();
    if (!cidade) {
      semCidade.push(lead);
      continue;
    }

    const chave = chaveCidade(cidade, lead.uf);
    const existente = mapa.get(chave);

    if (existente) {
      existente.total += 1;
      existente.valor += lead.valorEstimado ?? 0;
      existente.leads.push(lead);
      if (
        PIPELINE_STAGE_ORDEM[lead.pipelineStage] >
        PIPELINE_STAGE_ORDEM[existente.etapaPredominante]
      ) {
        existente.etapaPredominante = lead.pipelineStage;
      }
    } else {
      mapa.set(chave, {
        chave,
        nome: cidade,
        uf: (lead.uf ?? "").trim().toUpperCase(),
        total: 1,
        valor: lead.valorEstimado ?? 0,
        leads: [lead],
        etapaPredominante: lead.pipelineStage,
      });
    }
  }

  const grupos = Array.from(mapa.values()).sort(
    (a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"),
  );

  return { grupos, semCidade };
}

/**
 * Raio da bolha em pixels.
 *
 * Proporcional à **raiz quadrada** da contagem, não à contagem: o olho compara
 * círculos pela área, então usar o total como raio faria uma cidade com 4 leads
 * parecer ter 16 vezes o peso de uma com 1.
 */
export function raioDaBolha(total: number, maiorTotal: number, min = 8, max = 32): number {
  if (maiorTotal <= 0) return min;
  const proporcao = Math.sqrt(total) / Math.sqrt(maiorTotal);
  return Math.round(min + (max - min) * proporcao);
}

/** Cor da bolha: a da etapa mais avançada presente na cidade. */
export function corDoGrupo(grupo: GrupoCidade): string {
  return PIPELINE_STAGE_COLORS[grupo.etapaPredominante];
}

/**
 * Centro e zoom para enquadrar as cidades que têm coordenada.
 *
 * Sem nenhuma, cai no centro geográfico do estado de São Paulo — é onde a
 * empresa opera, e um mapa vazio centrado no oceano seria pior do que um mapa
 * vazio centrado em casa.
 */
export const CENTRO_PADRAO: [number, number] = [-23.5, -47.45];

export function enquadrar(
  pontos: { lat: number; lng: number }[],
): { centro: [number, number]; zoom: number } {
  if (pontos.length === 0) return { centro: CENTRO_PADRAO, zoom: 8 };

  const lats = pontos.map((p) => p.lat);
  const lngs = pontos.map((p) => p.lng);
  const centro: [number, number] = [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
  ];

  if (pontos.length === 1) return { centro, zoom: 11 };

  // Zoom pelo maior lado da caixa que contém tudo. Os cortes são graus de
  // latitude/longitude: ~1° ≈ 111 km.
  const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  const zoom = span > 10 ? 5 : span > 5 ? 6 : span > 2 ? 7 : span > 1 ? 8 : span > 0.5 ? 9 : 10;

  return { centro, zoom };
}
