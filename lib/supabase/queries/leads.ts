import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadInput, PipelineStage } from "@/types/lead";

interface LeadRow {
  id: string;
  name: string;
  cnpj: string | null;
  contato_nome: string | null;
  phone_raw: string | null;
  phone_e164: string | null;
  email: string | null;
  address: string | null;
  cidade: string | null;
  uf: string | null;
  origem: string | null;
  interesse: string | null;
  valor_estimado: number | null;
  pipeline_stage: PipelineStage;
  follow_up_at: string | null;
  follow_up_note: string | null;
  position: number;
  assigned_user_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    cnpj: row.cnpj,
    contatoNome: row.contato_nome,
    phoneRaw: row.phone_raw,
    phoneE164: row.phone_e164,
    email: row.email,
    address: row.address,
    cidade: row.cidade,
    uf: row.uf,
    origem: row.origem,
    interesse: row.interesse,
    valorEstimado: row.valor_estimado,
    pipelineStage: row.pipeline_stage,
    followUpAt: row.follow_up_at,
    followUpNote: row.follow_up_note,
    position: row.position,
    assignedUserId: row.assigned_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Só emite as chaves presentes no patch, para um update parcial não zerar campos
 * que o formulário nem exibiu. Substitui a família de `updateLeadAvcb`,
 * `updateLeadEndereco`, `updateLeadReceita`... que existia antes — uma função por
 * grupo de campos não escala para cinco entidades.
 */
function mapPatchToRow(patch: Partial<LeadInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("name" in patch) row.name = patch.name;
  if ("cnpj" in patch) row.cnpj = patch.cnpj;
  if ("contatoNome" in patch) row.contato_nome = patch.contatoNome;
  if ("phoneRaw" in patch) row.phone_raw = patch.phoneRaw;
  if ("phoneE164" in patch) row.phone_e164 = patch.phoneE164;
  if ("email" in patch) row.email = patch.email;
  if ("address" in patch) row.address = patch.address;
  if ("cidade" in patch) row.cidade = patch.cidade;
  if ("uf" in patch) row.uf = patch.uf;
  if ("origem" in patch) row.origem = patch.origem;
  if ("interesse" in patch) row.interesse = patch.interesse;
  if ("valorEstimado" in patch) row.valor_estimado = patch.valorEstimado;
  if ("pipelineStage" in patch) row.pipeline_stage = patch.pipelineStage;
  if ("followUpAt" in patch) row.follow_up_at = patch.followUpAt;
  if ("followUpNote" in patch) row.follow_up_note = patch.followUpNote;
  if ("assignedUserId" in patch) row.assigned_user_id = patch.assignedUserId;
  return row;
}

export async function fetchLeads(): Promise<Lead[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("position", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as LeadRow[]).map(mapRowToLead);
}

export async function createLead(input: Partial<LeadInput> & { name: string }): Promise<Lead> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    // position = Date.now() coloca o lead novo no topo da coluna "Novo Lead",
    // mesma convenção usada ao arrastar um card (ver moveLead).
    .insert({ ...mapPatchToRow(input), name: input.name, position: Date.now() })
    .select()
    .single();

  if (error) throw error;
  return mapRowToLead(data as LeadRow);
}

export async function updateLead(id: string, patch: Partial<LeadInput>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("leads").update(mapPatchToRow(patch)).eq("id", id);
  if (error) throw error;
}

/**
 * Move um lead de etapa dando a ele uma posição nova (a maior até agora), para o
 * card arrastado ir ao topo da coluna de destino. `position` usa Date.now() — um
 * número monotonicamente crescente — de modo que só esta linha é escrita, sem
 * reindexar a coluna inteira.
 */
export async function moveLead(
  id: string,
  pipelineStage: PipelineStage,
  position: number,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update({ pipeline_stage: pipelineStage, position })
    .eq("id", id);
  if (error) throw error;
}

/** Exclusão é restrita a admin pela RLS; um colaborador recebe 0 linhas afetadas. */
export async function deleteLead(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}
