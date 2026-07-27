import { createClient } from "@/lib/supabase/client";
import type { TipoTreinamento, Treinamento, TreinamentoInput } from "@/types/treinamento";

interface TreinamentoRow {
  id: string;
  cliente_id: string;
  tipo_treinamento_id: string | null;
  tipo_nome: string;
  data_realizacao: string;
  data_vencimento: string | null;
  participantes: number | null;
  instrutor: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToTreinamento(row: TreinamentoRow): Treinamento {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    tipoTreinamentoId: row.tipo_treinamento_id,
    tipoNome: row.tipo_nome,
    dataRealizacao: row.data_realizacao,
    dataVencimento: row.data_vencimento,
    participantes: row.participantes,
    instrutor: row.instrutor,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPatchToRow(patch: Partial<TreinamentoInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("clienteId" in patch) row.cliente_id = patch.clienteId;
  if ("tipoTreinamentoId" in patch) row.tipo_treinamento_id = patch.tipoTreinamentoId;
  if ("tipoNome" in patch) row.tipo_nome = patch.tipoNome;
  if ("dataRealizacao" in patch) row.data_realizacao = patch.dataRealizacao;
  if ("dataVencimento" in patch) row.data_vencimento = patch.dataVencimento;
  if ("participantes" in patch) row.participantes = patch.participantes;
  if ("instrutor" in patch) row.instrutor = patch.instrutor;
  if ("observacoes" in patch) row.observacoes = patch.observacoes;
  return row;
}

/**
 * Carrega tudo e filtra no cliente, como o resto do app. Serve confortavelmente
 * a alguns milhares de linhas; treinamentos é a tabela que cresce mais rápido
 * (clientes x NRs x anos), e quando incomodar a saída é filtrar por
 * data_vencimento no servidor aqui, não mudar a arquitetura.
 */
export async function fetchTreinamentos(): Promise<Treinamento[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("treinamentos")
    .select("*")
    .order("data_realizacao", { ascending: false });

  if (error) throw error;
  return (data as TreinamentoRow[]).map(mapRowToTreinamento);
}

export async function createTreinamento(input: TreinamentoInput): Promise<Treinamento> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("treinamentos")
    .insert(mapPatchToRow(input))
    .select()
    .single();

  if (error) throw error;
  return mapRowToTreinamento(data as TreinamentoRow);
}

export async function updateTreinamento(
  id: string,
  patch: Partial<TreinamentoInput>,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("treinamentos").update(mapPatchToRow(patch)).eq("id", id);
  if (error) throw error;
}

/** Restrito a admin pela RLS. */
export async function deleteTreinamento(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("treinamentos").delete().eq("id", id);
  if (error) throw error;
}

// --- catálogo -------------------------------------------------------------

interface TipoTreinamentoRow {
  id: string;
  nome: string;
  sigla: string | null;
  validade_meses: number | null;
  carga_horaria: number | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

function mapRowToTipo(row: TipoTreinamentoRow): TipoTreinamento {
  return {
    id: row.id,
    nome: row.nome,
    sigla: row.sigla,
    validadeMeses: row.validade_meses,
    cargaHoraria: row.carga_horaria,
    ativo: row.ativo,
    ordem: row.ordem,
    createdAt: row.created_at,
  };
}

export async function fetchTiposTreinamento(): Promise<TipoTreinamento[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tipos_treinamento")
    .select("*")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data as TipoTreinamentoRow[]).map(mapRowToTipo);
}

export type TipoTreinamentoInput = Omit<TipoTreinamento, "id" | "createdAt">;

function mapTipoPatchToRow(patch: Partial<TipoTreinamentoInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("nome" in patch) row.nome = patch.nome;
  if ("sigla" in patch) row.sigla = patch.sigla;
  if ("validadeMeses" in patch) row.validade_meses = patch.validadeMeses;
  if ("cargaHoraria" in patch) row.carga_horaria = patch.cargaHoraria;
  if ("ativo" in patch) row.ativo = patch.ativo;
  if ("ordem" in patch) row.ordem = patch.ordem;
  return row;
}

/** Insert/update/delete de tipos são restritos a admin pela RLS. */
export async function createTipoTreinamento(input: TipoTreinamentoInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tipos_treinamento").insert(mapTipoPatchToRow(input));
  if (error) throw error;
}

export async function updateTipoTreinamento(
  id: string,
  patch: Partial<TipoTreinamentoInput>,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tipos_treinamento")
    .update(mapTipoPatchToRow(patch))
    .eq("id", id);
  if (error) throw error;
}
