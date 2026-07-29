import { Badge } from "@mantine/core";
import { PIPELINE_STAGE_COLORS, PIPELINE_STAGE_LABELS } from "@/lib/pipeline/stages";
import type { PipelineStage } from "@/types/lead";

/**
 * A etapa do funil como selo colorido. Existe para a cor e o rótulo andarem
 * sempre juntos — cor sozinha não é sinal acessível, e rótulo sozinho não
 * diferencia à distância numa tabela de trinta linhas.
 */
export function StageBadge({ stage, size = "sm" }: { stage: PipelineStage; size?: string }) {
  return (
    <Badge color={PIPELINE_STAGE_COLORS[stage]} variant="light" size={size}>
      {PIPELINE_STAGE_LABELS[stage]}
    </Badge>
  );
}
