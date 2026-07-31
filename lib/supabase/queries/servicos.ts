import { createClient } from "@/lib/supabase/client";
import type {
  CategoriaServico,
  Servico,
  ServicoInput,
  ServicoStatus,
  TipoServico,
} from "@/types/servico";

interface ServicoRow {
  id: string;
  cliente_id: string;
  tipo_servico_id: string | null;
  tipo_nome: string;
  status: ServicoStatus;
  data_agendada: string | null;
  data_realizacao: string | null;
  data_vencimento: string | null;
  participantes: number | null;
  instrutor: string | null;
  responsavel_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToServico(row: ServicoRow): Servico {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    tipoServicoId: row.tipo_servico_id,
    tipoNome: row.tipo_nome,
    status: row.status,
    dataAgendada: row.data_agendada,
    dataRealizacao: row.data_realizacao,
    dataVencimento: row.data_vencimento,
    participantes: row.participantes,
    instrutor: row.instrutor,
    responsavelId: row.responsavel_id,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPatchToRow(patch: Partial<ServicoInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("clienteId" in patch) row.cliente_id = patch.clienteId;
  if ("tipoServicoId" in patch) row.tipo_servico_id = patch.tipoServicoId;
  if ("tipoNome" in patch) row.tipo_nome = patch.tipoNome;
  if ("status" in patch) row.status = patch.status;
  if ("dataAgendada" in patch) row.data_agendada = patch.dataAgendada;
  if ("dataRealizacao" in patch) row.data_realizacao = patch.dataRealizacao;
  if ("dataVencimento" in patch) row.data_vencimento = patch.dataVencimento;
  if ("participantes" in patch) row.participantes = patch.participantes;
  if ("instrutor" in patch) row.instrutor = patch.instrutor;
  if ("responsavelId" in patch) row.responsavel_id = patch.responsavelId;
  if ("observacoes" in patch) row.observacoes = patch.observacoes;
  return row;
}

/**
 * Carrega tudo e filtra no cliente, como o resto do app. Serve confortavelmente
 * a alguns milhares de linhas; esta é a tabela que cresce mais rápido
 * (clientes x serviços x anos), e quando incomodar a saída é filtrar por data no
 * servidor aqui, não mudar a arquitetura.
 */
export async function fetchServicos(): Promise<Servico[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("servicos")
    .select("*")
    .order("data_realizacao", { ascending: false, nullsFirst: true })
    .order("data_agendada", { ascending: true });

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

/**
 * Conclui um compromisso agendado. Limpa `dataAgendada` de propósito: a
 * constraint do banco exige que um `realizado` tenha `data_realizacao`, e manter
 * as duas datas faria o item aparecer duas vezes na agenda.
 */
export async function concluirServico(
  id: string,
  dataRealizacao: string,
  dataVencimento: string | null,
): Promise<void> {
  return updateServico(id, {
    status: "realizado",
    dataRealizacao,
    dataVencimento,
    dataAgendada: null,
  });
}

/** Restrito a admin pela RLS. */
export async function deleteServico(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("servicos").delete().eq("id", id);
  if (error) throw error;
}

// --- catálogo -------------------------------------------------------------

interface TipoServicoRow {
  id: string;
  nome: string;
  sigla: string | null;
  categoria: CategoriaServico;
  validade_meses: number | null;
  cnaes: string[] | null;
  carga_horaria: number | null;
  material_venda: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

function mapRowToTipo(row: TipoServicoRow): TipoServico {
  return {
    id: row.id,
    nome: row.nome,
    sigla: row.sigla,
    categoria: row.categoria,
    validadeMeses: row.validade_meses,
    cnaes: row.cnaes,
    cargaHoraria: row.carga_horaria,
    materialVenda: row.material_venda,
    ativo: row.ativo,
    ordem: row.ordem,
    createdAt: row.created_at,
  };
}

export async function fetchTiposServico(): Promise<TipoServico[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tipos_servico")
    .select("*")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data as TipoServicoRow[]).map(mapRowToTipo);
}

export type TipoServicoInput = Omit<TipoServico, "id" | "createdAt">;

function mapTipoPatchToRow(patch: Partial<TipoServicoInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("nome" in patch) row.nome = patch.nome;
  if ("sigla" in patch) row.sigla = patch.sigla;
  if ("categoria" in patch) row.categoria = patch.categoria;
  if ("validadeMeses" in patch) row.validade_meses = patch.validadeMeses;
  if ("cnaes" in patch) row.cnaes = patch.cnaes;
  if ("cargaHoraria" in patch) row.carga_horaria = patch.cargaHoraria;
  if ("materialVenda" in patch) row.material_venda = patch.materialVenda;
  if ("ativo" in patch) row.ativo = patch.ativo;
  if ("ordem" in patch) row.ordem = patch.ordem;
  return row;
}

/** Insert/update/delete de tipos são restritos a admin pela RLS. */
export async function createTipoServico(input: TipoServicoInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tipos_servico").insert(mapTipoPatchToRow(input));
  if (error) throw error;
}

export async function updateTipoServico(
  id: string,
  patch: Partial<TipoServicoInput>,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tipos_servico")
    .update(mapTipoPatchToRow(patch))
    .eq("id", id);
  if (error) throw error;
}

/**
 * Só sai do catálogo o tipo que nunca foi usado: `servicos.tipo_servico_id` é
 * `on delete restrict`, então o banco recusa apagar um tipo com serviço
 * registrado e a mensagem manda inativar (ver lib/errors.ts). É de propósito —
 * o serviço lastreia certificado emitido, e o catálogo é o que dá sentido ao
 * registro. Tipo que a empresa parou de vender vira `ativo = false`: some das
 * listas e o histórico continua legível.
 */
export async function deleteTipoServico(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tipos_servico").delete().eq("id", id);
  if (error) throw error;
}
