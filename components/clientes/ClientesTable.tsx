"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@mantine/core";
import { DataTable } from "@/components/shared/DataTable";
import { SITUACAO_LABELS, situacaoCliente, type ItemVencivel } from "@/lib/vencimentos";
import { nomeCliente, type Cliente } from "@/types/cliente";

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
        cell: (c) =>
          c.getValue() === "inativo" ? (
            <Badge color="gray" variant="outline">
              Inativo
            </Badge>
          ) : null,
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
