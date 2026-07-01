"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Table, Text } from "@mantine/core";
import { AvcbStatusBadge } from "@/components/leads/AvcbStatusBadge";
import { PIPELINE_STAGE_LABELS } from "@/lib/pipeline/stages";
import type { Lead } from "@/types/lead";

const columns: ColumnDef<Lead>[] = [
  { accessorKey: "name", header: "Nome" },
  { accessorKey: "category", header: "Categoria", cell: (c) => c.getValue() ?? "—" },
  { accessorKey: "rating", header: "Nota", cell: (c) => c.getValue() ?? "—" },
  { accessorKey: "phoneRaw", header: "Telefone", cell: (c) => c.getValue() ?? "—" },
  { accessorKey: "address", header: "Endereço", cell: (c) => c.getValue() ?? "—" },
  {
    accessorKey: "pipelineStage",
    header: "Etapa",
    cell: (c) => PIPELINE_STAGE_LABELS[c.getValue() as Lead["pipelineStage"]],
  },
  {
    accessorKey: "avcbStatus",
    header: "Licença",
    cell: (c) => (
      <AvcbStatusBadge
        status={c.getValue() as Lead["avcbStatus"]}
        tipo={c.row.original.tipoLicenca}
      />
    ),
  },
];

interface Props {
  leads: Lead[];
  onRowClick: (lead: Lead) => void;
}

export function LeadsTable({ leads, onRowClick }: Props) {
  const table = useReactTable({ data: leads, columns, getCoreRowModel: getCoreRowModel() });

  if (leads.length === 0) {
    return <Text c="dimmed">Nenhum lead encontrado.</Text>;
  }

  return (
    <Table.ScrollContainer minWidth={700}>
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Th>
            ))}
          </Table.Tr>
        ))}
      </Table.Thead>
      <Table.Tbody>
        {table.getRowModel().rows.map((row) => (
          <Table.Tr
            key={row.id}
            onClick={() => onRowClick(row.original)}
            style={{ cursor: "pointer" }}
          >
            {row.getVisibleCells().map((cell) => (
              <Table.Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
    </Table.ScrollContainer>
  );
}
