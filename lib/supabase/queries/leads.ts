import { createClient } from "@/lib/supabase/client";
import type { AvcbStatus, Lead, ParsedLead, PipelineStage } from "@/types/lead";

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
  avcb_status: AvcbStatus;
  avcb_validade: string | null;
  assigned_user_id: string | null;
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
    avcbStatus: row.avcb_status,
    avcbValidade: row.avcb_validade,
    assignedUserId: row.assigned_user_id,
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

async function findExistingKeys(parsedLeads: ParsedLead[]): Promise<Set<string>> {
  if (parsedLeads.length === 0) return new Set();

  const supabase = createClient();
  const placeIds = parsedLeads.map((l) => l.placeId).filter((id): id is string => id !== null);
  const mapsUrls = parsedLeads.map((l) => l.mapsUrl);

  const { data: existing, error } = await supabase
    .from("leads")
    .select("place_id, maps_url")
    .or(
      [
        placeIds.length > 0 ? `place_id.in.(${placeIds.map((id) => `"${id}"`).join(",")})` : null,
        `maps_url.in.(${mapsUrls.map((url) => `"${url}"`).join(",")})`,
      ]
        .filter(Boolean)
        .join(","),
    );

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

export async function updateLeadAvcb(
  id: string,
  avcbStatus: AvcbStatus,
  avcbValidade: string | null,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("leads")
    .update({ avcb_status: avcbStatus, avcb_validade: avcbValidade })
    .eq("id", id);
  if (error) throw error;
}
