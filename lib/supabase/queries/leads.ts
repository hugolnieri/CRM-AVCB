import { createClient } from "@/lib/supabase/client";
import type {
  AvcbStatus,
  EnderecoDetalhado,
  Lead,
  LicencaTipo,
  ParsedLead,
  PipelineStage,
} from "@/types/lead";
import type { ReceitaData } from "@/types/receita";

interface LeadRow {
  id: string;
  place_id: string | null;
  maps_url: string;
  name: string;
  category: string | null;
  rating: number | null;
  review_count: number | null;
  phone_raw: string | null;
  phone_e164: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  last_review_snippet: string | null;
  pipeline_stage: PipelineStage;
  tipo_licenca: LicencaTipo;
  avcb_status: AvcbStatus;
  avcb_validade: string | null;
  assigned_user_id: string | null;
  cnpj: string | null;
  receita_data: ReceitaData | null;
  endereco_detalhado: EnderecoDetalhado | null;
  position: number;
  created_at: string;
  updated_at: string;
}

function mapRowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    placeId: row.place_id,
    mapsUrl: row.maps_url,
    name: row.name,
    category: row.category,
    rating: row.rating,
    reviewCount: row.review_count,
    phoneRaw: row.phone_raw,
    phoneE164: row.phone_e164,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    photoUrl: row.photo_url,
    lastReviewSnippet: row.last_review_snippet,
    pipelineStage: row.pipeline_stage,
    tipoLicenca: row.tipo_licenca,
    avcbStatus: row.avcb_status,
    avcbValidade: row.avcb_validade,
    assignedUserId: row.assigned_user_id,
    cnpj: row.cnpj,
    receitaData: row.receita_data,
    enderecoDetalhado: row.endereco_detalhado,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapParsedLeadToInsertRow(lead: ParsedLead) {
  return {
    place_id: lead.placeId,
    maps_url: lead.mapsUrl,
    name: lead.name,
    category: lead.category,
    rating: lead.rating,
    review_count: lead.reviewCount,
    phone_raw: lead.phoneRaw,
    phone_e164: lead.phoneE164,
    address: lead.address,
    lat: lead.lat,
    lng: lead.lng,
    photo_url: lead.photoUrl,
    last_review_snippet: lead.lastReviewSnippet,
  };
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

export async function fetchLeadById(id: string): Promise<Lead> {
  const supabase = createClient();
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).single();

  if (error) throw error;
  return mapRowToLead(data as LeadRow);
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  skippedLeads: ParsedLead[];
}

/**
 * Fetches every existing key with no WHERE filter — building a `.in.(...)` filter
 * out of dozens of full (very long) Google Maps URLs produces a request URL long
 * enough to get rejected outright (400 Bad Request) once an import has more than
 * a handful of rows. The leads table is small by design (free-tier CRM, not a
 * data warehouse), so fetching all keys and intersecting client-side is simpler
 * and far more robust than trying to keep a hand-built filter string safe.
 */
async function findExistingKeys(parsedLeads: ParsedLead[]): Promise<Set<string>> {
  if (parsedLeads.length === 0) return new Set();

  const supabase = createClient();
  const { data: existing, error } = await supabase.from("leads").select("place_id, maps_url");

  if (error) throw error;

  return new Set(
    (existing as { place_id: string | null; maps_url: string }[]).map(
      (e) => e.place_id ?? e.maps_url,
    ),
  );
}

/** Used by the import preview screen to show "novo" vs "já existe" before committing. */
export async function previewImport(parsedLeads: ParsedLead[]): Promise<Set<string>> {
  return findExistingKeys(parsedLeads);
}

/**
 * Insert-only-new import: never updates a lead that already exists (matched by
 * place_id, falling back to maps_url), so a re-scrape of the same area can't
 * clobber manually-edited avcb_status/avcb_validade/pipeline_stage.
 */
export async function importLeads(parsedLeads: ParsedLead[]): Promise<ImportResult> {
  const supabase = createClient();
  const existingKeys = await findExistingKeys(parsedLeads);

  const newLeads = parsedLeads.filter((l) => !existingKeys.has(l.placeId ?? l.mapsUrl));
  const skippedLeads = parsedLeads.filter((l) => existingKeys.has(l.placeId ?? l.mapsUrl));

  if (newLeads.length > 0) {
    const { error: insertError } = await supabase
      .from("leads")
      .insert(newLeads.map(mapParsedLeadToInsertRow));
    if (insertError) throw insertError;
  }

  return { inserted: newLeads.length, skipped: skippedLeads.length, skippedLeads };
}

export async function updateLeadStage(id: string, pipelineStage: PipelineStage): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("leads").update({ pipeline_stage: pipelineStage }).eq("id", id);
  if (error) throw error;
}

/**
 * Moves a lead to a stage and gives it a fresh (largest-so-far) position, so a
 * dragged card jumps to the top of its column. `position` uses Date.now() — a
 * monotonically increasing number — so we only write this one row, never
 * reindexing the whole column (columns can hold hundreds of leads).
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

export async function updateLeadAvcb(
  id: string,
  tipoLicenca: LicencaTipo,
  avcbStatus: AvcbStatus,
  avcbValidade: string | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update({ tipo_licenca: tipoLicenca, avcb_status: avcbStatus, avcb_validade: avcbValidade })
    .eq("id", id);
  if (error) throw error;
}

export async function updateLeadReceita(
  id: string,
  cnpj: string,
  receitaData: ReceitaData,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update({ cnpj, receita_data: receitaData })
    .eq("id", id);
  if (error) throw error;
}

export async function updateLeadEndereco(
  id: string,
  enderecoDetalhado: EnderecoDetalhado,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update({ endereco_detalhado: enderecoDetalhado })
    .eq("id", id);
  if (error) throw error;
}
