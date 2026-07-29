"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@mantine/core";
import { DataTable } from "@/components/shared/DataTable";
import { SITUACAO_LABELS, situacaoCliente, type ItemVencivel } from "@/lib/vencimentos";
import { CLIENTE_STATUS_LABELS, nomeCliente, type Cliente } from "@/types/cliente";

interface Props {
  clientes: Cliente[];
  /** Itens que vencem, de todos os clientes — a situação é derivada, não armazenada. */
  itens: ItemVencivel[];
  onRowClick: (cliente: Cliente) => void;
}

export function ClientesTable({ clientes, itens, onRowClick }: Props) {
  const columns = useMemo<ColumnDef<Cliente>[]>(
    () => [
      { id: "nome", header: "Cliente", accessorFn: (c) => nomeCliente(c) },
      { accessorKey: "cnpj", header: "CNPJ", cell: (c) => c.getValue() ?? "—" },
      { accessorKey: "contatoNome", header: "Contato", cell: (c) => c.getValue() ?? "—" },
      { accessorKey: "telefone", header: "Telefone", cell: (c) => c.getValue() ?? "—" },
      {
        id: "cidade",
        header: "Cidade",
        accessorFn: (c) => [c.cidade, c.uf].filter(Boolean).join(" - "),
        cell: (c) => (c.getValue() as string) || "—",
      },
      {
        id: "situacao",
        header: "Situação",
        // Derivada de `itens`, não de uma coluna da linha: não há valor para o
        // TanStack comparar.
        enableSorting: false,
        cell: (c) => {
          const { label, color } = SITUACAO_LABELS[situacaoCliente(c.row.original.id, itens)];
          return (
            <Badge color={color} variant="light">
              {label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "status",
        header: "",
        enableSorting: false,
        cell: (c) => {
          const status = c.getValue() as Cliente["status"];
          if (status === "ativo") return null;
          const { label, color } = CLIENTE_STATUS_LABELS[status];
          return (
            <Badge color={color} variant="outline">
              {label}
            </Badge>
          );
        },
      },
    ],
    [itens],
  );

  return (
    <DataTable
      data={clientes}
      columns={columns}
      onRowClick={onRowClick}
      emptyMessage="Nenhum cliente encontrado."
      minWidth={900}
    />
  );
}
