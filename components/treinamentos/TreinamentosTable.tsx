"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge, Text } from "@mantine/core";
import dayjs from "dayjs";
import { DataTable } from "@/components/shared/DataTable";
import { VENCIMENTO_BUCKETS, vencimentoBucket } from "@/lib/vencimentos";
import { nomeCliente, type Cliente } from "@/types/cliente";
import type { Treinamento } from "@/types/treinamento";

/** "YYYY-MM-DD" -> "DD/MM/YYYY". Sem passar por Date: a coluna é `date`. */
export function formatDate(value: string | null): string {
  return value ? dayjs(value).format("DD/MM/YYYY") : "—";
}

export function VencimentoBadge({ dataVencimento }: { dataVencimento: string | null }) {
  if (!dataVencimento) {
    return (
      <Text size="sm" c="dimmed">
        Não vence
      </Text>
    );
  }
  const bucket = vencimentoBucket(dataVencimento);
  const meta = VENCIMENTO_BUCKETS.find((b) => b.value === bucket);
  return (
    <Badge color={meta?.color} variant="light">
      {formatDate(dataVencimento)}
    </Badge>
  );
}

interface Props {
  treinamentos: Treinamento[];
  clientes: Cliente[];
  onRowClick: (treinamento: Treinamento) => void;
  /** Esconde a coluna de cliente quando a tabela já vive dentro de um cliente. */
  hideCliente?: boolean;
}

export function TreinamentosTable({ treinamentos, clientes, onRowClick, hideCliente }: Props) {
  const columns = useMemo<ColumnDef<Treinamento>[]>(() => {
    const nomePorId = new Map(clientes.map((c) => [c.id, nomeCliente(c)]));

    const base: ColumnDef<Treinamento>[] = [
      { accessorKey: "tipoNome", header: "Treinamento" },
      {
        accessorKey: "dataRealizacao",
        header: "Realizado em",
        cell: (c) => formatDate(c.getValue() as string),
      },
      {
        accessorKey: "dataVencimento",
        header: "Vence em",
        cell: (c) => <VencimentoBadge dataVencimento={c.getValue() as string | null} />,
      },
      { accessorKey: "participantes", header: "Part.", cell: (c) => c.getValue() ?? "—" },
      { accessorKey: "instrutor", header: "Instrutor", cell: (c) => c.getValue() ?? "—" },
    ];

    if (hideCliente) return base;
    return [
      {
        id: "cliente",
        header: "Cliente",
        accessorFn: (t: Treinamento) => nomePorId.get(t.clienteId) ?? "—",
      },
      ...base,
    ];
  }, [clientes, hideCliente]);

  return (
    <DataTable
      data={treinamentos}
      columns={columns}
      onRowClick={onRowClick}
      emptyMessage="Nenhum treinamento registrado."
      minWidth={800}
    />
  );
}
