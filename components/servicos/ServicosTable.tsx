"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { VencimentoBadge, formatDate } from "@/components/treinamentos/TreinamentosTable";
import { nomeCliente, type Cliente } from "@/types/cliente";
import type { Servico } from "@/types/servico";
import type { TeamMember } from "@/types/team";

interface Props {
  servicos: Servico[];
  clientes: Cliente[];
  membros: TeamMember[];
  onRowClick: (servico: Servico) => void;
  hideCliente?: boolean;
}

export function ServicosTable({ servicos, clientes, membros, onRowClick, hideCliente }: Props) {
  const columns = useMemo<ColumnDef<Servico>[]>(() => {
    const nomePorId = new Map(clientes.map((c) => [c.id, nomeCliente(c)]));
    const membroPorId = new Map(membros.map((m) => [m.id, m.fullName]));

    const base: ColumnDef<Servico>[] = [
      { accessorKey: "tipo", header: "Serviço" },
      { accessorKey: "data", header: "Data", cell: (c) => formatDate(c.getValue() as string) },
      {
        accessorKey: "dataProxima",
        header: "Próxima",
        cell: (c) => <VencimentoBadge dataVencimento={c.getValue() as string | null} />,
      },
      {
        id: "responsavel",
        header: "Responsável",
        accessorFn: (s: Servico) => (s.responsavelId ? membroPorId.get(s.responsavelId) : null) ?? "—",
      },
    ];

    if (hideCliente) return base;
    return [
      {
        id: "cliente",
        header: "Cliente",
        accessorFn: (s: Servico) => nomePorId.get(s.clienteId) ?? "—",
      },
      ...base,
    ];
  }, [clientes, membros, hideCliente]);

  return (
    <DataTable
      data={servicos}
      columns={columns}
      onRowClick={onRowClick}
      emptyMessage="Nenhum serviço registrado."
      minWidth={800}
    />
  );
}
