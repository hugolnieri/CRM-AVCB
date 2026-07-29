import type { Row } from "@tanstack/react-table";
import { PIPELINE_STAGE_ORDEM } from "@/lib/pipeline/stages";
import type { PipelineStage } from "@/types/lead";

/**
 * Ordena pela posição da etapa no funil, não pelo texto do enum.
 *
 * A ordenação padrão do TanStack compara o valor da célula, e o valor aqui é a
 * string do enum: `contato_feito` < `fechado_ganho` < `novo_lead`. Ordem
 * alfabética perfeita e completamente errada para um funil.
 */
export function ordenarPorEtapa<T>(rowA: Row<T>, rowB: Row<T>, columnId: string): number {
  const a = PIPELINE_STAGE_ORDEM[rowA.getValue(columnId) as PipelineStage] ?? -1;
  const b = PIPELINE_STAGE_ORDEM[rowB.getValue(columnId) as PipelineStage] ?? -1;
  return a - b;
}

/**
 * Ordena texto em pt-BR: "Ávila" vem depois de "Alves" e antes de "Bastos", o
 * que a comparação por code point não faz. `sensitivity: "base"` também iguala
 * maiúscula e minúscula, para "ACME" não se separar de "Acme".
 */
export function ordenarTextoPtBr<T>(rowA: Row<T>, rowB: Row<T>, columnId: string): number {
  return String(rowA.getValue(columnId) ?? "").localeCompare(
    String(rowB.getValue(columnId) ?? ""),
    "pt-BR",
    { sensitivity: "base" },
  );
}
