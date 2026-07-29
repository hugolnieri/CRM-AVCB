import { createClient } from "@/lib/supabase/client";
import type { Tarefa, TarefaInput, TarefaPrioridade } from "@/types/tarefa";

interface TarefaRow {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: TarefaPrioridade;
  prazo: string | null;
  responsavel_id: string | null;
  concluida_em: string | null;
  concluida_por: string | null;
  cliente_id: string | null;
  lead_id: string | null;
  servico_id: string | null;
  origem_pendencia: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToTarefa(row: TarefaRow): Tarefa {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    prioridade: row.prioridade,
    prazo: row.prazo,
    responsavelId: row.responsavel_id,
    concluidaEm: row.concluida_em,
    concluidaPor: row.concluida_por,
    clienteId: row.cliente_id,
    leadId: row.lead_id,
    servicoId: row.servico_id,
    origemPendencia: row.origem_pendencia,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Só emite as chaves presentes, para update parcial não zerar campo. */
function mapPatchToRow(patch: Partial<TarefaInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("titulo" in patch) row.titulo = patch.titulo;
  if ("descricao" in patch) row.descricao = patch.descricao;
  if ("prioridade" in patch) row.prioridade = patch.prioridade;
  if ("prazo" in patch) row.prazo = patch.prazo;
  if ("responsavelId" in patch) row.responsavel_id = patch.responsavelId;
  if ("clienteId" in patch) row.cliente_id = patch.clienteId;
  if ("leadId" in patch) row.lead_id = patch.leadId;
  if ("servicoId" in patch) row.servico_id = patch.servicoId;
  if ("origemPendencia" in patch) row.origem_pendencia = patch.origemPendencia;
  return row;
}

export async function fetchTarefas(): Promise<Tarefa[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tarefas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as TarefaRow[]).map(mapRowToTarefa);
}

export async function createTarefa(input: Partial<TarefaInput> & { titulo: string }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tarefas").insert(mapPatchToRow(input));
  if (error) throw error;
}

/** Uma updateTarefa genérica, como manda a convenção da camada de queries. */
export async function updateTarefa(id: string, patch: Partial<TarefaInput>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tarefas").update(mapPatchToRow(patch)).eq("id", id);
  if (error) throw error;
}

/**
 * Conclui ou reabre. `concluida_em` e `concluida_por` andam juntos — a
 * constraint `tarefas_concluida_coerente` recusa um sem o outro.
 */
export async function concluirTarefa(id: string, concluida: boolean): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");

  const { error } = await supabase
    .from("tarefas")
    .update(
      concluida
        ? { concluida_em: new Date().toISOString(), concluida_por: user.id }
        : { concluida_em: null, concluida_por: null },
    )
    .eq("id", id);

  if (error) throw error;
}

export async function deleteTarefa(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tarefas").delete().eq("id", id);
  if (error) throw error;
}
