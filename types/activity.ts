export type ActivityType =
  | "note"
  | "call"
  | "whatsapp"
  | "visit"
  | "stage_change"
  | "follow_up";

export interface Activity {
  id: string;
  leadId: string;
  authorId: string | null;
  activityType: ActivityType;
  body: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
