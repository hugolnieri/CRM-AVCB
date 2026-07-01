import { Badge } from "@mantine/core";
import { AVCB_STATUS_COLORS, AVCB_STATUS_LABELS } from "@/lib/pipeline/avcbStatus";
import type { AvcbStatus, LicencaTipo } from "@/types/lead";

export function AvcbStatusBadge({ status, tipo }: { status: AvcbStatus; tipo?: LicencaTipo }) {
  // Prefix with the license type only once it's actually been checked — an
  // untouched lead shows plain "Não informado" without an implied AVCB/CLCB.
  const label =
    tipo && status !== "nao_informado"
      ? `${tipo} · ${AVCB_STATUS_LABELS[status]}`
      : AVCB_STATUS_LABELS[status];

  return <Badge color={AVCB_STATUS_COLORS[status]}>{label}</Badge>;
}
