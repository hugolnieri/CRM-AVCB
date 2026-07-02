import dayjs from "dayjs";
import type { Lead } from "@/types/lead";

export type FollowUpBucket = "atrasado" | "hoje" | "proximos" | "futuro";

/**
 * Em que "balde" um retorno cai, relativo a agora:
 *  - atrasado: o dia do retorno já passou (dia anterior a hoje)
 *  - hoje: é hoje (em qualquer horário) — nunca conta como atrasado durante o dia
 *  - proximos: dentro dos próximos 7 dias
 *  - futuro: além de 7 dias
 *
 * A checagem de "hoje" vem antes da de "atrasado" de propósito: um retorno
 * marcado para hoje mais cedo (ou à meia-noite, quando só a data foi escolhida)
 * não deve piscar como atrasado o dia inteiro.
 */
export function followUpBucket(followUpAt: string, now = dayjs()): FollowUpBucket {
  const when = dayjs(followUpAt);
  if (when.isSame(now, "day")) return "hoje";
  if (when.isBefore(now, "day")) return "atrasado";
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
