"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { LeadCardView } from "@/components/kanban/LeadCard";
import { useUpdateLeadStage } from "@/hooks/useUpdateLead";
import { PIPELINE_STAGES } from "@/lib/pipeline/stages";
import { getErrorMessage } from "@/lib/errors";
import type { Lead, PipelineStage } from "@/types/lead";

interface Props {
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
}

export function KanbanBoard({ leads, onCardClick }: Props) {
  const updateStage = useUpdateLeadStage();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveLead(leads.find((l) => l.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const toStage = over.id as PipelineStage;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Always bring the dragged card to the top of its column (position = now),
    // whether it changed columns or was reordered within the same one.
    updateStage.mutate(
      { leadId, fromStage: lead.pipelineStage, toStage, position: Date.now() },
      {
        onError: (err) =>
          notifications.show({
            color: "red",
            message: getErrorMessage(err, "Erro ao mover o lead."),
          }),
      },
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveLead(null)}
    >
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

      <DragOverlay>{activeLead ? <LeadCardView lead={activeLead} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
