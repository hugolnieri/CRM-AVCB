import { useDroppable } from "@dnd-kit/core";
import { Box, Paper, ScrollArea, Stack, Text } from "@mantine/core";
import { LeadCard } from "@/components/kanban/LeadCard";
import type { Lead, PipelineStage } from "@/types/lead";

interface Props {
  stage: PipelineStage;
  label: string;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  dragging: boolean;
}

export function KanbanColumn({ stage, label, leads, onCardClick, dragging }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  // Show a drop preview at the top of the column being hovered — that's where
  // the dragged card will land (moved cards always go to the top).
  const showPlaceholder = dragging && isOver;

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
          {showPlaceholder && (
            <Box
              mb="xs"
              style={{
                height: 64,
                borderRadius: "var(--mantine-radius-md)",
                border: "2px dashed var(--mantine-color-blue-5)",
                backgroundColor: "var(--mantine-color-blue-light)",
              }}
            />
          )}
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={onCardClick} />
          ))}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
