import { createClient } from "@/lib/supabase/client";
import type { Activity, ActivityType } from "@/types/activity";

interface ActivityRow {
  id: string;
  lead_id: string;
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
    authorId: row.author_id,
    activityType: row.activity_type,
    body: row.body,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export async function fetchActivitiesForLead(leadId: string): Promise<Activity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as ActivityRow[]).map(mapRowToActivity);
}

export async function addActivity(
  leadId: string,
  activityType: ActivityType,
  body: string | null,
  metadata: Record<string, unknown> | null = null,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // activities.author_id has a FK to team_members(id). Users created before the
  // sign-up upsert existed (or whose upsert failed) have no profile row, which
  // makes this insert violate the constraint. Guarantee the profile exists first.
  if (user) {
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Usuário";
    await supabase
      .from("team_members")
      .upsert({ id: user.id, full_name: fullName, email: user.email ?? "" });
  }

  const { error } = await supabase.from("activities").insert({
    lead_id: leadId,
    author_id: user?.id ?? null,
    activity_type: activityType,
    body,
    metadata,
  });

  if (error) throw error;
}
