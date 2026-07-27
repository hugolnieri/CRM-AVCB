export type ActivityType =
  | "note"
  | "call"
  | "whatsapp"
  | "visit"
  | "stage_change"
  | "follow_up"
  | "converted";

/**
 * Dono de uma atividade: ou um lead, ou um cliente, nunca os dois (o banco
 * garante isso com o check `activities_one_owner`). Usar uma união em vez de dois
 * campos anuláveis faz o TypeScript recusar `{}` e `{leadId, clienteId}`.
 */
export type ActivityOwner = { leadId: string } | { clienteId: string };

export interface Activity {
  id: string;
  leadId: string | null;
  clienteId: string | null;
  authorId: string | null;
  activityType: ActivityType;
  body: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** Chave estável para o queryKey do TanStack Query e para o cache de activities. */
export function ownerKey(owner: ActivityOwner): [string, string] {
  return "leadId" in owner ? ["lead", owner.leadId] : ["cliente", owner.clienteId];
}
