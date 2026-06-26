"use client";

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { useUpdateLeadStage } from "@/hooks/useUpdateLead";
import { PIPELINE_STAGES } from "@/lib/pipeline/stages";
import type { Lead, PipelineStage } from "@/types/lead";

interface Props {
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
}

export function KanbanBoard({ leads, onCardClick }: Props) {
  const updateStage = useUpdateLeadStage();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const toStage = over.id as PipelineStage;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.pipelineStage === toStage) return;

    updateStage.mutate(
      { leadId, fromStage: lead.pipelineStage, toStage },
      {
        onError: (err) =>
          notifications.show({
            color: "red",
            message: err instanceof Error ? err.message : "Erro ao mover o lead.",
          }),
      },
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <Group align="flex-start" wrap="nowrap" style={{ overflowX: "auto" }}>
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage.value}
            stage={stage.value}
            label={stage.label}
            leads={leads.filter((l) => l.pipelineStage === stage.value)}
            onCardClick={onCardClick}
          />
        ))}
      </Group>
    </DndContext>
  );
}
