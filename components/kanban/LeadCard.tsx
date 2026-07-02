import { useDraggable } from "@dnd-kit/core";
import { Card, Text, Group, Tooltip } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";
import { AvcbStatusBadge } from "@/components/leads/AvcbStatusBadge";
import type { Lead } from "@/types/lead";

/**
 * Presentational card, with no dnd hooks — reused both inside a column and by
 * the DragOverlay (which renders a copy that follows the cursor above every
 * column, so it isn't clipped by the origin column's ScrollArea).
 */
export function LeadCardView({
  lead,
  dragging = false,
  overlay = false,
}: {
  lead: Lead;
  dragging?: boolean;
  overlay?: boolean;
}) {
  return (
    <Card
      withBorder
      shadow={overlay ? "lg" : "sm"}
      padding="sm"
      mb="xs"
      style={{
        cursor: "grab",
        opacity: dragging ? 0.4 : 1,
        width: overlay ? 228 : undefined,
      }}
    >
      <Text fw={500} size="sm">
        {lead.name}
      </Text>
      <Text size="xs" c="dimmed">
        {lead.category ?? "Sem categoria"}
      </Text>
      <Group justify="space-between" mt="xs" wrap="nowrap">
        <AvcbStatusBadge status={lead.avcbStatus} tipo={lead.tipoLicenca} />
        {lead.followUpAt && <FollowUpBadge followUpAt={lead.followUpAt} />}
      </Group>
    </Card>
  );
}

/** Selo compacto de follow-up: vermelho só se o dia já passou; hoje/futuro em azul. */
function FollowUpBadge({ followUpAt }: { followUpAt: string }) {
  const overdue = dayjs(followUpAt).isBefore(dayjs(), "day");
  return (
    <Tooltip label={`Retornar em ${dayjs(followUpAt).format("DD/MM/YYYY HH:mm")}`} withArrow>
      <Group gap={3} wrap="nowrap" c={overdue ? "red" : "blue"} style={{ flexShrink: 0 }}>
        <IconClock size={13} />
        <Text size="xs" fw={500} style={{ whiteSpace: "nowrap" }}>
          {dayjs(followUpAt).format("DD/MM")}
        </Text>
      </Group>
    </Tooltip>
  );
}

interface Props {
  lead: Lead;
  onClick: (lead: Lead) => void;
}

export function LeadCard({ lead, onClick }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onClick(lead)}
      style={{ touchAction: "none" }}
      {...listeners}
      {...attributes}
    >
      <LeadCardView lead={lead} dragging={isDragging} />
    </div>
  );
}
