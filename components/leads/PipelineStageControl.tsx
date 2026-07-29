"use client";

import { Badge, Button, Group, Paper, Select, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_COLORS,
  PIPELINE_STAGE_LABELS,
} from "@/lib/pipeline/stages";
import { useUpdateLeadStage } from "@/hooks/useUpdateLead";
import { getErrorMessage } from "@/lib/errors";
import type { Lead, PipelineStage } from "@/types/lead";

/** Etapa do funil com setas de avançar/voltar e um Select para pular direto. */
export function PipelineStageControl({ lead }: { lead: Lead }) {
  const updateStage = useUpdateLeadStage();
  const stageIndex = PIPELINE_STAGES.findIndex((s) => s.value === lead.pipelineStage);

  function changeStage(toStage: PipelineStage) {
    if (toStage === lead.pipelineStage) return;
    updateStage.mutate(
      {
        leadId: lead.id,
        fromStage: lead.pipelineStage,
        toStage,
        // Posição nova para o card ir ao topo da coluna de destino, igual ao drag.
        position: Date.now(),
      },
      {
        onSuccess: () =>
          notifications.show({
            color: "green",
            message: `Movido para "${PIPELINE_STAGE_LABELS[toStage]}".`,
          }),
        onError: (err) =>
          notifications.show({
            color: "red",
            message: getErrorMessage(err, "Erro ao mover o lead."),
          }),
      },
    );
  }

  return (
    <Paper withBorder p="sm" radius="md">
      <Text size="xs" c="dimmed" mb={6}>
        Etapa do pipeline
      </Text>
      <Group gap="xs" align="flex-end" wrap="nowrap">
        <Button
          variant="default"
          size="sm"
          px="sm"
          disabled={stageIndex <= 0 || updateStage.isPending}
          onClick={() => changeStage(PIPELINE_STAGES[stageIndex - 1].value)}
          aria-label="Etapa anterior"
        >
          <IconChevronLeft size={16} />
        </Button>
        <Select
          data={PIPELINE_STAGES.map((s) => ({ value: s.value, label: s.label }))}
          value={lead.pipelineStage}
          onChange={(value) => value && changeStage(value as PipelineStage)}
          allowDeselect={false}
          disabled={updateStage.isPending}
          leftSection={
            <Badge color={PIPELINE_STAGE_COLORS[lead.pipelineStage]} circle size="xs" />
          }
          renderOption={({ option }) => (
            <Group gap="xs" wrap="nowrap">
              <Badge
                color={PIPELINE_STAGE_COLORS[option.value as PipelineStage]}
                circle
                size="xs"
                style={{ flexShrink: 0 }}
              />
              <Text size="sm">{option.label}</Text>
            </Group>
          )}
          style={{ flex: 1 }}
        />
        <Button
          variant="default"
          size="sm"
          px="sm"
          disabled={stageIndex >= PIPELINE_STAGES.length - 1 || updateStage.isPending}
          onClick={() => changeStage(PIPELINE_STAGES[stageIndex + 1].value)}
          aria-label="Próxima etapa"
        >
          <IconChevronRight size={16} />
        </Button>
      </Group>
    </Paper>
  );
}
