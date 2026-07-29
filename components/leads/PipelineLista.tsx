"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Text } from "@mantine/core";
import { DataTable } from "@/components/shared/DataTable";
import { StageBadge } from "@/components/leads/StageBadge";
import { ordenarPorEtapa, ordenarTextoPtBr } from "@/lib/pipeline/ordenacao";
import type { Lead } from "@/types/lead";

const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: "name",
    header: "Empresa",
    sortingFn: ordenarTextoPtBr,
  },
  {
    accessorKey: "pipelineStage",
    header: "Etapa",
    // Pelo funil, não pelo alfabeto do enum — ver lib/pipeline/ordenacao.ts.
    sortingFn: ordenarPorEtapa,
    cell: (c) => <StageBadge stage={c.getValue() as Lead["pipelineStage"]} />,
  },
  {
    id: "valorEstimado",
    header: "Valor",
    // `undefined` e não `null`: é o que faz o `sortUndefined` do TanStack levar
    // os leads sem valor para o fim nas duas direções, em vez de tratá-los como
    // zero e enterrá-los junto dos negócios de menor valor.
    accessorFn: (lead) => lead.valorEstimado ?? undefined,
    sortUndefined: "last",
    cell: (c) => {
      const valor = c.getValue() as number | undefined;
      if (valor === undefined) {
        return (
          <Text size="sm" c="dimmed">
            —
          </Text>
        );
      }
      return (
        <Text size="sm" fw={500}>
          {valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          })}
        </Text>
      );
    },
  },
];

/**
 * O mesmo pipeline do kanban, em lista ordenável. Serve o caso que o quadro não
 * serve: comparar valores entre etapas e varrer a carteira em ordem alfabética,
 * que num kanban exige ler seis colunas ao mesmo tempo.
 */
export function PipelineLista({
  leads,
  onRowClick,
}: {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
}) {
  return (
    <DataTable
      data={leads}
      columns={columns}
      onRowClick={onRowClick}
      emptyMessage="Nenhum lead encontrado."
      minWidth={520}
      defaultSorting={[{ id: "pipelineStage", desc: false }]}
    />
  );
}
