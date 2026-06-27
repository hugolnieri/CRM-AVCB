import type { AvcbStatus } from "@/types/lead";

/**
 * The Infosimples API returns a free-text "situação" (e.g. "AVCB Vigente",
 * "CLCB Vencido", "Cancelado"), not a fixed enum, so this is a best-effort
 * heuristic to suggest a value — the user always confirms before saving.
 */
export function inferAvcbStatus(situacao: string): AvcbStatus {
  const s = situacao.toLowerCase();
  if (/vigente|regular|v[aá]lid/.test(s)) return "em_dia";
  if (/vencid|cancelad|cassad|suspens|irregular|indeferid|negad/.test(s)) return "vencido";
  return "nao_informado";
}
