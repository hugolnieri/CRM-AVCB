import { createClient } from "@/lib/supabase/client";
import type { Meta, MetaInput, MetaMetrica, MetaPeriodo } from "@/types/meta";

interface MetaRow {
  id: string;
  member_id: string | null;
  nome: string;
  metrica: MetaMetrica;
  periodo: MetaPeriodo;
  alvo: number;
  ativa: boolean;
  inicio_em: string | null;
  fim_em: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToMeta(row: MetaRow): Meta {
  return {
    id: row.id,
    memberId: row.member_id,
    nome: row.nome,
    metrica: row.metrica,
    periodo: row.periodo,
    // numeric do Postgres chega como string no PostgREST quando passa da
    // precisão de double; Number() normaliza os dois casos.
    alvo: Number(row.alvo),
    ativa: row.ativa,
    inicioEm: row.inicio_em,
    fimEm: row.fim_em,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPatchToRow(patch: Partial<MetaInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("memberId" in patch) row.member_id = patch.memberId;
  if ("nome" in patch) row.nome = patch.nome;
  if ("metrica" in patch) row.metrica = patch.metrica;
  if ("periodo" in patch) row.periodo = patch.periodo;
  if ("alvo" in patch) row.alvo = patch.alvo;
  if ("ativa" in patch) row.ativa = patch.ativa;
  if ("inicioEm" in patch) row.inicio_em = patch.inicioEm;
  if ("fimEm" in patch) row.fim_em = patch.fimEm;
  return row;
}

export async function fetchMetas(): Promise<Meta[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("metas")
    .select("*")
    .order("ativa", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as MetaRow[]).map(mapRowToMeta);
}

/** Criar, editar e excluir metas são restritos a admin pela RLS. */
export async function createMeta(input: MetaInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("metas").insert(mapPatchToRow(input));
  if (error) throw error;
}

export async function updateMeta(id: string, patch: Partial<MetaInput>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("metas").update(mapPatchToRow(patch)).eq("id", id);
  if (error) throw error;
}

export async function deleteMeta(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("metas").delete().eq("id", id);
  if (error) throw error;
}
