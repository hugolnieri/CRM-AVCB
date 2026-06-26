import { Badge } from "@mantine/core";
import { AVCB_STATUS_COLORS, AVCB_STATUS_LABELS } from "@/lib/pipeline/avcbStatus";
import type { AvcbStatus } from "@/types/lead";

export function AvcbStatusBadge({ status }: { status: AvcbStatus }) {
  return <Badge color={AVCB_STATUS_COLORS[status]}>{AVCB_STATUS_LABELS[status]}</Badge>;
}
