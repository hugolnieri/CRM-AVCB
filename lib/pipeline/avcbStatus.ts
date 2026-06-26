import type { AvcbStatus } from "@/types/lead";

export const AVCB_STATUSES: { value: AvcbStatus; label: string; color: string }[] = [
  { value: "em_dia", label: "Em dia", color: "green" },
  { value: "a_vencer", label: "A vencer", color: "yellow" },
  { value: "vencido", label: "Vencido", color: "red" },
  { value: "nao_informado", label: "Não informado", color: "gray" },
];

export const AVCB_STATUS_LABELS: Record<AvcbStatus, string> = AVCB_STATUSES.reduce(
  (acc, status) => ({ ...acc, [status.value]: status.label }),
  {} as Record<AvcbStatus, string>,
);

export const AVCB_STATUS_COLORS: Record<AvcbStatus, string> = AVCB_STATUSES.reduce(
  (acc, status) => ({ ...acc, [status.value]: status.color }),
  {} as Record<AvcbStatus, string>,
);
