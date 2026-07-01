import { useDraggable } from "@dnd-kit/core";
import { Card, Text, Group } from "@mantine/core";
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
      <Group justify="space-between" mt="xs">
        <AvcbStatusBadge status={lead.avcbStatus} />
      </Group>
    </Card>
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
