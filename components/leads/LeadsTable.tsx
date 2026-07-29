"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Text } from "@mantine/core";
import dayjs from "dayjs";
import { DataTable } from "@/components/shared/DataTable";
import { StageBadge } from "@/components/leads/StageBadge";
import { ordenarPorEtapa } from "@/lib/pipeline/ordenacao";
import type { Lead } from "@/types/lead";

const columns: ColumnDef<Lead>[] = [
  { accessorKey: "name", header: "Empresa" },
  { accessorKey: "contatoNome", header: "Contato", cell: (c) => c.getValue() ?? "—" },
  { accessorKey: "phoneRaw", header: "Telefone", cell: (c) => c.getValue() ?? "—" },
  {
    id: "cidade",
    header: "Cidade",
    accessorFn: (lead) => [lead.cidade, lead.uf].filter(Boolean).join(" - "),
    cell: (c) => (c.getValue() as string) || "—",
  },
  { accessorKey: "interesse", header: "Interesse", cell: (c) => c.getValue() ?? "—" },
  { accessorKey: "origem", header: "Origem", cell: (c) => c.getValue() ?? "—" },
  {
    accessorKey: "pipelineStage",
    header: "Etapa",
    // Sem isto a ordenação seria alfabética pelo enum, e "fechado_ganho" viria
    // antes de "novo_lead".
    sortingFn: ordenarPorEtapa,
    cell: (c) => <StageBadge stage={c.getValue() as Lead["pipelineStage"]} />,
  },
  {
    accessorKey: "followUpAt",
    header: "Retorno",
    cell: (c) => {
      const value = c.getValue() as string | null;
      if (!value) return "—";
      const overdue = dayjs(value).isBefore(dayjs(), "day");
      return (
        <Text size="sm" c={overdue ? "red" : undefined} fw={overdue ? 500 : undefined}>
          {dayjs(value).format("DD/MM/YYYY")}
        </Text>
      );
    },
  },
];

interface Props {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
}

export function LeadsTable({ leads, onRowClick }: Props) {
  return (
    <DataTable
      data={leads}
      columns={columns}
      onRowClick={onRowClick}
      emptyMessage="Nenhum lead encontrado."
      minWidth={900}
    />
  );
}
