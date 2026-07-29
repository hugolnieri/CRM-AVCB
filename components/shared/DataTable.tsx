"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Center, Group, Table, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconSelector } from "@tabler/icons-react";

interface Props<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Abaixo disto a tabela rola na horizontal em vez de espremer as colunas. */
  minWidth?: number;
  /**
   * Ordenação por clique no cabeçalho. Ligada por padrão; uma coluna sem valor
   * ordenável (um botão, um selo derivado) desliga a sua com
   * `enableSorting: false` no próprio ColumnDef.
   */
  sortable?: boolean;
  /** Ordem inicial, quando a lista já chega ordenada de outro jeito. */
  defaultSorting?: SortingState;
}

/**
 * Tabela padrão do app: TanStack Table para o modelo, Mantine para a marcação.
 * Toda lista (leads, clientes, serviços, equipe, tipos) usa esta — cada uma só
 * declara seu `ColumnDef<T>[]`.
 */
export function DataTable<T>({
  data,
  columns,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado.",
  minWidth = 700,
  sortable = true,
  defaultSorting = [],
}: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);

  const table = useReactTable({
    data,
    columns,
    state: sortable ? { sorting } : undefined,
    onSortingChange: sortable ? setSorting : undefined,
    enableSorting: sortable,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortable ? getSortedRowModel() : undefined,
  });

  if (data.length === 0) {
    return <Text c="dimmed">{emptyMessage}</Text>;
  }

  return (
    <Table.ScrollContainer minWidth={minWidth}>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const conteudo = flexRender(header.column.columnDef.header, header.getContext());
                if (!header.column.getCanSort()) {
                  return <Table.Th key={header.id}>{conteudo}</Table.Th>;
                }

                const direcao = header.column.getIsSorted();
                const Icone =
                  direcao === "asc"
                    ? IconChevronUp
                    : direcao === "desc"
                      ? IconChevronDown
                      : IconSelector;

                return (
                  <Table.Th key={header.id} p={0}>
                    <UnstyledButton
                      onClick={header.column.getToggleSortingHandler()}
                      w="100%"
                      px="md"
                      py="sm"
                      aria-label={`Ordenar por ${header.column.id}`}
                    >
                      <Group gap={4} wrap="nowrap" justify="space-between">
                        <Text size="sm" fw={700} lineClamp={1}>
                          {conteudo}
                        </Text>
                        <Center c={direcao ? undefined : "dimmed"} style={{ flexShrink: 0 }}>
                          <Icone size={14} />
                        </Center>
                      </Group>
                    </UnstyledButton>
                  </Table.Th>
                );
              })}
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
