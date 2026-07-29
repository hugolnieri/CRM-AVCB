import { createClient } from "@/lib/supabase/client";
import type { Prospeccao } from "@/types/prospeccao";

interface ProspeccaoRow {
  id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  matriz: boolean;
  cnae: string;
  cnae_descricao: string | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string;
  uf: string;
  telefone: string | null;
  email: string | null;
  porte: string | null;
  capital_social: number | null;
  inicio_atividade: string | null;
  competencia: string;
  virou_lead_em: string | null;
  lead_id: string | null;
  descartada_em: string | null;
  descartada_por: string | null;
  created_at: string;
}

function mapRowToProspeccao(row: ProspeccaoRow): Prospeccao {
  return {
    id: row.id,
    cnpj: row.cnpj,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    matriz: row.matriz,
    cnae: row.cnae,
    cnaeDescricao: row.cnae_descricao,
    endereco: row.endereco,
    bairro: row.bairro,
    cep: row.cep,
    cidade: row.cidade,
    uf: row.uf,
    telefone: row.telefone,
    email: row.email,
    porte: row.porte,
    capitalSocial: row.capital_social,
    inicioAtividade: row.inicio_atividade,
    competencia: row.competencia,
    virouLeadEm: row.virou_lead_em,
    leadId: row.lead_id,
    descartadaEm: row.descartada_em,
    descartadaPor: row.descartada_por,
    createdAt: row.created_at,
  };
}

export interface FiltroProspeccao {
  /** Vazio = todas as cidades da base. */
  cidades?: string[];
  /** Prefixos de CNAE. Vazio = todos os segmentos. */
  cnaes?: string[];
  /** Códigos de porte da Receita. Vazio = todos. */
  portes?: string[];
  /** Teto de linhas trazidas. A base tem milhares; a tela trabalha com dezenas. */
  limite?: number;
}

/**
 * A fila: o que ainda não virou lead nem foi descartado.
 *
 * O recorte é feito no banco e não no navegador porque a base cresce todo mês e
 * a tela sempre quer um pedaço pequeno dela. Trazer 20.000 linhas para filtrar
 * com `.filter()` seria pagar o custo inteiro para usar 50.
 */
export async function fetchProspeccao(filtro: FiltroProspeccao = {}): Promise<Prospeccao[]> {
  const supabase = createClient();

  let query = supabase
    .from("prospeccao")
    .select("*")
    .is("virou_lead_em", null)
    .is("descartada_em", null);

  if (filtro.cidades?.length) query = query.in("cidade", filtro.cidades);
  if (filtro.portes?.length) query = query.in("porte", filtro.portes);

  // Prefixo de CNAE: `or` com um `like` por prefixo. O índice text_pattern_ops
  // é justamente o que faz `like 'digitos%'` não virar varredura de tabela.
  if (filtro.cnaes?.length) {
    query = query.or(filtro.cnaes.map((c) => `cnae.like.${c}*`).join(","));
  }

  // Maior primeiro: capital social é o único sinal de porte ordenável, e a
  // qualificação de verdade (lib/qualificacao.ts) depende do catálogo, que o
  // banco não conhece. Ordenar aqui só garante que o teto não corte o topo.
  const { data, error } = await query
    .order("capital_social", { ascending: false, nullsFirst: false })
    .limit(filtro.limite ?? 200);

  if (error) throw error;
  return (data ?? []).map(mapRowToProspeccao);
}

/** As cidades que existem na fila, para montar o filtro sem inventar opções. */
export async function fetchCidadesProspeccao(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prospeccao")
    .select("cidade")
    .is("virou_lead_em", null)
    .is("descartada_em", null);

  if (error) throw error;
  const cidades = new Set((data ?? []).map((r) => r.cidade as string));
  return [...cidades].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** De quando é o material. Vazio quando a base ainda não foi coletada. */
export async function fetchCompetencia(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prospeccao")
    .select("competencia")
    .order("competencia", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.competencia as string) ?? null;
}

/** Quantas ainda estão na fila, sem trazer as linhas. */
export async function contarProspeccao(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("prospeccao")
    .select("id", { count: "exact", head: true })
    .is("virou_lead_em", null)
    .is("descartada_em", null);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Tira da fila.
 *
 * Marcar é o que impede a coleta do mês seguinte de ressuscitar uma empresa que
 * alguém já decidiu — por isso a tabela não tem DELETE.
 */
export async function marcarComoLead(id: string, leadId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("prospeccao")
    .update({ virou_lead_em: new Date().toISOString(), lead_id: leadId })
    .eq("id", id);
  if (error) throw error;
}

export async function descartar(ids: string[], memberId: string | null): Promise<void> {
  if (ids.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("prospeccao")
    .update({ descartada_em: new Date().toISOString(), descartada_por: memberId })
    .in("id", ids);
  if (error) throw error;
}
