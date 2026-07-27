"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Table, Text } from "@mantine/core";

interface Props<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Abaixo disto a tabela rola na horizontal em vez de espremer as colunas. */
  minWidth?: number;
}

/**
 * Tabela padrão do app: TanStack Table para o modelo, Mantine para a marcação.
 * Toda lista (leads, clientes, treinamentos, serviços, equipe, tipos) usa esta —
 * cada uma só declara seu `ColumnDef<T>[]`.
 */
export function DataTable<T>({
  data,
  columns,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado.",
  minWidth = 700,
}: Props<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  if (data.length === 0) {
    return <Text c="dimmed">{emptyMessage}</Text>;
  }

  return (
    <Table.ScrollContainer minWidth={minWidth}>
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
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              style={onRowClick ? { cursor: "pointer" } : undefined}
            >
              {row.getVisibleCells().map((cell) => (
                <Table.Td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
