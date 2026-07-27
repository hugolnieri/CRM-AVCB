import { createClient } from "@/lib/supabase/client";
import type { Activity, ActivityOwner, ActivityType } from "@/types/activity";

interface ActivityRow {
  id: string;
  lead_id: string | null;
  cliente_id: string | null;
  author_id: string | null;
  activity_type: ActivityType;
  body: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function mapRowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    leadId: row.lead_id,
    clienteId: row.cliente_id,
    authorId: row.author_id,
    activityType: row.activity_type,
    body: row.body,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

/** Coluna/valor do dono, resolvidos uma vez só para o filtro e para o insert. */
function ownerColumn(owner: ActivityOwner): [string, string] {
  return "leadId" in owner ? ["lead_id", owner.leadId] : ["cliente_id", owner.clienteId];
}

export async function fetchActivities(owner: ActivityOwner): Promise<Activity[]> {
  const supabase = createClient();
  const [column, value] = ownerColumn(owner);
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq(column, value)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as ActivityRow[]).map(mapRowToActivity);
}

export async function addActivity(
  owner: ActivityOwner,
  activityType: ActivityType,
  body: string | null,
  metadata: Record<string, unknown> | null = null,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [column, value] = ownerColumn(owner);
  const { error } = await supabase.from("activities").insert({
    [column]: value,
    author_id: user?.id ?? null,
    activity_type: activityType,
    body,
    metadata,
  });

  if (error) throw error;
}
