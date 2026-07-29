import type { PipelineStage } from "@/types/lead";

/**
 * As etapas na ordem do funil. A ordem deste array é usada como ordem de
 * verdade em três lugares — colunas do kanban, ordenação da lista e o
 * `porEtapa` dos relatórios — então mexer aqui reordena tudo junto.
 *
 * Sobre as cores. Duas regras, ambas de leitura, não de gosto:
 *
 * 1. A rampa acompanha o funil: cinza → azul → ciano → violeta lê como
 *    progressão. Só os dois estados terminais fogem dela, porque neles a cor
 *    carrega significado (ganhou/perdeu) e não posição.
 * 2. Laranja e amarelo ficam de fora de propósito. Já significam "a vencer" e
 *    "dado incompleto" em lib/vencimentos.ts e lib/painel.ts — etapa saudável do
 *    funil pintada de laranja colidiria com o único lugar do app onde laranja
 *    quer dizer urgência.
 *
 * A cor nunca é o único sinal: o rótulo acompanha em todo lugar que a usa.
 */
export const PIPELINE_STAGES: { value: PipelineStage; label: string; color: string }[] = [
  { value: "novo_lead", label: "Novo Lead", color: "gray" },
  { value: "contato_feito", label: "Contato Feito", color: "blue" },
  { value: "visita_diagnostico_agendado", label: "Visita/Diagnóstico Agendado", color: "cyan" },
  { value: "proposta_enviada", label: "Proposta Enviada", color: "violet" },
  { value: "fechado_ganho", label: "Fechado (Ganho)", color: "green" },
  { value: "fechado_perdido", label: "Fechado (Perdido)", color: "red" },
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = PIPELINE_STAGES.reduce(
  (acc, stage) => ({ ...acc, [stage.value]: stage.label }),
  {} as Record<PipelineStage, string>,
);

export const PIPELINE_STAGE_COLORS: Record<PipelineStage, string> = PIPELINE_STAGES.reduce(
  (acc, stage) => ({ ...acc, [stage.value]: stage.color }),
  {} as Record<PipelineStage, string>,
);

/**
 * Posição da etapa no funil. Existe para ordenar por etapa sem cair na ordem
 * alfabética do enum, que colocaria "Fechado (Ganho)" antes de "Novo Lead".
 */
export const PIPELINE_STAGE_ORDEM: Record<PipelineStage, number> = PIPELINE_STAGES.reduce(
  (acc, stage, index) => ({ ...acc, [stage.value]: index }),
  {} as Record<PipelineStage, number>,
);
