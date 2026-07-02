import dayjs from "dayjs";
import type { Lead } from "@/types/lead";

export type FollowUpBucket = "atrasado" | "hoje" | "proximos" | "futuro";

/**
 * Em que "balde" um retorno cai, relativo a agora:
 *  - atrasado: já passou da data/hora e ainda não foi tratado
 *  - hoje: vence ainda hoje (mais tarde)
 *  - proximos: dentro dos próximos 7 dias
 *  - futuro: além de 7 dias
 */
export function followUpBucket(followUpAt: string, now = dayjs()): FollowUpBucket {
  const when = dayjs(followUpAt);
  if (when.isBefore(now)) return "atrasado";
  if (when.isSame(now, "day")) return "hoje";
  if (when.isBefore(now.add(7, "day"))) return "proximos";
  return "futuro";
}

export interface LeadWithFollowUp extends Lead {
  followUpAt: string;
}

/** Leads com follow-up agendado, ordenados do mais urgente ao mais distante. */
export function leadsWithFollowUp(leads: Lead[]): LeadWithFollowUp[] {
  return leads
    .filter((l): l is LeadWithFollowUp => Boolean(l.followUpAt))
    .sort((a, b) => dayjs(a.followUpAt).diff(dayjs(b.followUpAt)));
}
