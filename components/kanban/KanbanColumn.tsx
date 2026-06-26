import { useDroppable } from "@dnd-kit/core";
import { Paper, ScrollArea, Stack, Text } from "@mantine/core";
import { LeadCard } from "@/components/kanban/LeadCard";
import type { Lead, PipelineStage } from "@/types/lead";

interface Props {
  stage: PipelineStage;
  label: string;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
}

export function KanbanColumn({ stage, label, leads, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <Paper
      ref={setNodeRef}
      withBorder
      p="sm"
      w={260}
      style={{ backgroundColor: isOver ? "var(--mantine-color-blue-light)" : undefined }}
    >
      <Text fw={600} size="sm" mb="sm">
        {label} ({leads.length})
      </Text>
      <ScrollArea h={560}>
        <Stack gap={0}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={onCardClick} />
          ))}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
