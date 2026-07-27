import { createClient } from "@/lib/supabase/client";
import type { Servico, ServicoInput } from "@/types/servico";

interface ServicoRow {
  id: string;
  cliente_id: string;
  tipo: string;
  data: string;
  data_proxima: string | null;
  responsavel_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToServico(row: ServicoRow): Servico {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    tipo: row.tipo,
    data: row.data,
    dataProxima: row.data_proxima,
    responsavelId: row.responsavel_id,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPatchToRow(patch: Partial<ServicoInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("clienteId" in patch) row.cliente_id = patch.clienteId;
  if ("tipo" in patch) row.tipo = patch.tipo;
  if ("data" in patch) row.data = patch.data;
  if ("dataProxima" in patch) row.data_proxima = patch.dataProxima;
  if ("responsavelId" in patch) row.responsavel_id = patch.responsavelId;
  if ("observacoes" in patch) row.observacoes = patch.observacoes;
  return row;
}

export async function fetchServicos(): Promise<Servico[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("servicos")
    .select("*")
    .order("data", { ascending: false });

  if (error) throw error;
  return (data as ServicoRow[]).map(mapRowToServico);
}

export async function createServico(input: ServicoInput): Promise<Servico> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("servicos")
    .insert(mapPatchToRow(input))
    .select()
    .single();

  if (error) throw error;
  return mapRowToServico(data as ServicoRow);
}

export async function updateServico(id: string, patch: Partial<ServicoInput>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("servicos").update(mapPatchToRow(patch)).eq("id", id);
  if (error) throw error;
}

/** Restrito a admin pela RLS. */
export async function deleteServico(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("servicos").delete().eq("id", id);
  if (error) throw error;
}
