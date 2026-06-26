import type { PipelineStage } from "@/types/lead";

export const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
  { value: "novo_lead", label: "Novo Lead" },
  { value: "contato_feito", label: "Contato Feito" },
  { value: "visita_diagnostico_agendado", label: "Visita/Diagnóstico Agendado" },
  { value: "proposta_enviada", label: "Proposta Enviada" },
  { value: "fechado_ganho", label: "Fechado (Ganho)" },
  { value: "fechado_perdido", label: "Fechado (Perdido)" },
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = PIPELINE_STAGES.reduce(
  (acc, stage) => ({ ...acc, [stage.value]: stage.label }),
  {} as Record<PipelineStage, string>,
);
