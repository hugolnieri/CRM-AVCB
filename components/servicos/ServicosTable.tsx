"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge, Group, Text } from "@mantine/core";
import { IconCalendarClock, IconCertificate, IconTool } from "@tabler/icons-react";
import dayjs from "dayjs";
import { DataTable } from "@/components/shared/DataTable";
import { VENCIMENTO_BUCKETS, vencimentoBucket } from "@/lib/vencimentos";
import { nomeCliente, type Cliente } from "@/types/cliente";
import { SERVICO_STATUS_LABELS, type Servico, type TipoServico } from "@/types/servico";
import type { TeamMember } from "@/types/team";

/** "YYYY-MM-DD" -> "DD/MM/YYYY". Sem passar por Date: a coluna é `date`. */
export function formatDate(value: string | null): string {
  return value ? dayjs(value).format("DD/MM/YYYY") : "—";
}

export function VencimentoBadge({ dataVencimento }: { dataVencimento: string | null }) {
  if (!dataVencimento) {
    return (
      <Text size="sm" c="dimmed">
        —
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
  servicos: Servico[];
  clientes: Cliente[];
  membros: TeamMember[];
  tipos: TipoServico[];
  onRowClick: (servico: Servico) => void;
  /** Esconde a coluna de cliente quando a tabela já vive dentro de um cliente. */
  hideCliente?: boolean;
}

export function ServicosTable({
  servicos,
  clientes,
  membros,
  tipos,
  onRowClick,
  hideCliente,
}: Props) {
  const columns = useMemo<ColumnDef<Servico>[]>(() => {
    const nomePorId = new Map(clientes.map((c) => [c.id, nomeCliente(c)]));
    const membroPorId = new Map(membros.map((m) => [m.id, m.fullName]));
    const categoriaPorTipo = new Map(tipos.map((t) => [t.id, t.categoria]));

    const base: ColumnDef<Servico>[] = [
      {
        id: "tipo",
        header: "Serviço",
        accessorFn: (s) => s.tipoNome,
        cell: (c) => {
          const servico = c.row.original;
          const categoria = servico.tipoServicoId
            ? categoriaPorTipo.get(servico.tipoServicoId)
            : undefined;
          return (
            <Group gap={6} wrap="nowrap">
              {categoria === "servico" ? (
                <IconTool size={15} style={{ flexShrink: 0 }} />
              ) : (
                <IconCertificate size={15} style={{ flexShrink: 0 }} />
              )}
              <Text size="sm">{servico.tipoNome}</Text>
            </Group>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Situação",
        cell: (c) => {
          const meta = SERVICO_STATUS_LABELS[c.getValue() as Servico["status"]];
          return (
            <Badge color={meta.color} variant="light">
              {meta.label}
            </Badge>
          );
        },
      },
      {
        id: "quando",
        header: "Quando",
        cell: (c) => {
          const s = c.row.original;
          if (s.status === "agendado" && s.dataAgendada) {
            return (
              <Group gap={4} wrap="nowrap">
                <IconCalendarClock size={14} />
                <Text size="sm">{dayjs(s.dataAgendada).format("DD/MM/YYYY HH:mm")}</Text>
              </Group>
            );
          }
          return formatDate(s.dataRealizacao);
        },
      },
      {
        accessorKey: "dataVencimento",
        header: "Vence em",
        cell: (c) => <VencimentoBadge dataVencimento={c.getValue() as string | null} />,
      },
      {
        id: "responsavel",
        header: "Responsável",
        accessorFn: (s: Servico) =>
          (s.responsavelId ? membroPorId.get(s.responsavelId) : null) ?? "—",
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
  }, [clientes, membros, tipos, hideCliente]);

  return (
    <DataTable
      data={servicos}
      columns={columns}
      onRowClick={onRowClick}
      emptyMessage="Nenhum serviço registrado."
      minWidth={900}
    />
  );
}
