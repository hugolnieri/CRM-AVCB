import { useDraggable } from "@dnd-kit/core";
import { Card, Text, Group } from "@mantine/core";
import { AvcbStatusBadge } from "@/components/leads/AvcbStatusBadge";
import type { Lead } from "@/types/lead";

interface Props {
  lead: Lead;
  onClick: (lead: Lead) => void;
}

export function LeadCard({ lead, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <Card
      ref={setNodeRef}
      withBorder
      shadow="sm"
      padding="sm"
      mb="xs"
      onClick={() => onClick(lead)}
      style={{
        cursor: "pointer",
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : undefined,
        position: "relative",
      }}
      {...listeners}
      {...attributes}
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
