import { useDroppable } from "@dnd-kit/core";
import { Badge, Box, Group, Paper, ScrollArea, Stack, Text } from "@mantine/core";
import { LeadCard } from "@/components/kanban/LeadCard";
import { PIPELINE_STAGE_COLORS } from "@/lib/pipeline/stages";
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
  const cor = PIPELINE_STAGE_COLORS[stage];

  // Show a drop preview at the top of the column being hovered — that's where
  // the dragged card will land (moved cards always go to the top).
  const showPlaceholder = dragging && isOver;

  return (
    <Paper
      ref={setNodeRef}
      withBorder
      p="sm"
      w={260}
      style={{
        backgroundColor: isOver ? `var(--mantine-color-${cor}-light)` : undefined,
        // Faixa da cor da etapa no topo: identifica a coluna mesmo com o
        // cabeçalho rolado para fora numa tela pequena.
        borderTop: `3px solid var(--mantine-color-${cor}-6)`,
      }}
    >
      <Group justify="space-between" wrap="nowrap" mb="sm">
        <Text fw={600} size="sm" lineClamp={1}>
          {label}
        </Text>
        <Badge color={cor} variant="light" size="sm" style={{ flexShrink: 0 }}>
          {leads.length}
        </Badge>
      </Group>
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
