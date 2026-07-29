"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Alert,
  Badge,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import dayjs from "dayjs";
import { DataTable } from "@/components/shared/DataTable";
import { useAuditLog } from "@/hooks/useAuditoria";
import { useTeamMembers } from "@/hooks/useCurrentMember";
import {
  ACAO_LABELS,
  alteracoesLegiveis,
  descreverEntrada,
  formatarValor,
  rotularCampo,
  TABELA_LABELS,
} from "@/lib/auditoria";
import type { AuditAcao, AuditEntry } from "@/types/auditoria";

const PERIODOS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

/**
 * O que cada pessoa fez no sistema.
 *
 * A lista vem de `audit_log`, escrita por gatilho no banco — não há caminho de
 * escrita a partir do app, nem para o admin. Ver
 * supabase/migrations/0009_auditoria.sql.
 */
export function AuditoriaTab() {
  const [dias, setDias] = useState("30");
  const [memberId, setMemberId] = useState<string | null>(null);
  const [tabela, setTabela] = useState<string | null>(null);
  const [acao, setAcao] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<AuditEntry | null>(null);

  const { data: membros } = useTeamMembers();
  const desde = useMemo(
    () => dayjs().subtract(Number(dias), "day").startOf("day").toISOString(),
    [dias],
  );
  const { data: entradas, isLoading } = useAuditLog({
    desde,
    memberId,
    tabela,
    acao: (acao as AuditAcao | null) ?? null,
  });

  const nomePorId = useMemo(
    () => new Map((membros ?? []).map((m) => [m.id, m.fullName])),
    [membros],
  );

  const columns = useMemo<ColumnDef<AuditEntry>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Quando",
        cell: (c) => (
          <Text size="sm" style={{ whiteSpace: "nowrap" }}>
            {dayjs(c.getValue() as string).format("DD/MM/YY HH:mm")}
          </Text>
        ),
      },
      {
        id: "quem",
        header: "Quem",
        accessorFn: (e) =>
          e.memberId ? (nomePorId.get(e.memberId) ?? "Removido") : "Sistema",
        cell: (c) => <Text size="sm">{c.getValue() as string}</Text>,
      },
      {
        accessorKey: "acao",
        header: "Ação",
        cell: (c) => {
          const { label, color } = ACAO_LABELS[c.getValue() as AuditAcao];
          return (
            <Badge color={color} variant="light" size="sm">
              {label}
            </Badge>
          );
        },
      },
      {
        id: "descricao",
        header: "O quê",
        enableSorting: false,
        accessorFn: (e) => descreverEntrada(e),
        cell: (c) => <Text size="sm">{c.getValue() as string}</Text>,
      },
    ],
    [nomePorId],
  );

  return (
    <Stack>
      <Alert color="gray" variant="light" icon={<IconInfoCircle size={18} />}>
        Registro automático de tudo que é criado, alterado ou excluído no sistema. É gravado pelo
        banco de dados, não pelo aplicativo — ninguém consegue agir sem deixar rastro, nem editar
        este registro depois. Notas e avisos não aparecem aqui: já têm histórico próprio no lead e
        na aba de Notificações.
      </Alert>

      <Group>
        <Select
          label="Período"
          data={PERIODOS}
          value={dias}
          onChange={(v) => setDias(v ?? "30")}
          allowDeselect={false}
          w={180}
        />
        <Select
          label="Colaborador"
          placeholder="Todos"
          data={(membros ?? []).map((m) => ({ value: m.id, label: m.fullName }))}
          value={memberId}
          onChange={setMemberId}
          clearable
          searchable
          w={200}
        />
        <Select
          label="Registro"
          placeholder="Todos"
          data={Object.entries(TABELA_LABELS).map(([value, meta]) => ({
            value,
            label: meta.singular,
          }))}
          value={tabela}
          onChange={setTabela}
          clearable
          w={180}
        />
        <Select
          label="Ação"
          placeholder="Todas"
          data={Object.entries(ACAO_LABELS).map(([value, meta]) => ({
            value,
            label: meta.label,
          }))}
          value={acao}
          onChange={setAcao}
          clearable
          w={150}
        />
      </Group>

      {isLoading ? (
        <Loader />
      ) : (
        <>
          <Text size="sm" c="dimmed">
            {(entradas ?? []).length === 500
              ? "Mostrando as 500 ações mais recentes do período. Estreite o filtro para ver o resto."
              : `${(entradas ?? []).length} ${(entradas ?? []).length === 1 ? "ação" : "ações"} no período.`}
          </Text>
          <DataTable
            data={entradas ?? []}
            columns={columns}
            onRowClick={setSelecionada}
            emptyMessage="Nenhuma ação registrada neste período."
            minWidth={720}
          />
        </>
      )}

      {/* Modal direto, e não DetailModal: aquele exige `id: string` e a chave do
          log é bigint. */}
      <Modal
        opened={selecionada !== null}
        onClose={() => setSelecionada(null)}
        size="lg"
        centered
        title={selecionada && <Title order={4}>{descreverEntrada(selecionada)}</Title>}
      >
        {selecionada && <DetalheEntrada entrada={selecionada} nomePorId={nomePorId} />}
      </Modal>
    </Stack>
  );
}

function DetalheEntrada({
  entrada,
  nomePorId,
}: {
  entrada: AuditEntry;
  nomePorId: Map<string, string>;
}) {
  const alteracoes = alteracoesLegiveis(entrada);

  return (
    <Stack gap="sm">
      <Group gap="lg">
        <Campo rotulo="Quando" valor={dayjs(entrada.createdAt).format("DD/MM/YYYY HH:mm:ss")} />
        <Campo
          rotulo="Quem"
          valor={entrada.memberId ? (nomePorId.get(entrada.memberId) ?? "Removido") : "Sistema"}
        />
        <Campo rotulo="Registro" valor={TABELA_LABELS[entrada.tabela]?.singular ?? entrada.tabela} />
      </Group>

      {alteracoes.length > 0 ? (
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Campo</Table.Th>
              <Table.Th>Antes</Table.Th>
              <Table.Th>Depois</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {alteracoes.map((a) => (
              <Table.Tr key={a.campo}>
                <Table.Td>{a.rotulo}</Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {a.de}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {a.para}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <LinhaCompleta entrada={entrada} />
      )}
    </Stack>
  );
}

/** Insert e delete guardam a linha inteira; mostra os campos preenchidos. */
function LinhaCompleta({ entrada }: { entrada: AuditEntry }) {
  const campos = Object.entries(entrada.dados ?? {}).filter(
    ([campo, valor]) =>
      valor !== null &&
      valor !== "" &&
      !["id", "created_at", "updated_at", "created_by", "position"].includes(campo),
  );

  if (campos.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Sem detalhes registrados.
      </Text>
    );
  }

  return (
    <Table striped withTableBorder>
      <Table.Tbody>
        {campos.map(([campo, valor]) => (
          <Table.Tr key={campo}>
            <Table.Td w="40%">{rotularCampo(campo)}</Table.Td>
            <Table.Td>
              <Text size="sm">{formatarValor(campo, valor)}</Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {rotulo}
      </Text>
      <Text size="sm" fw={500}>
        {valor}
      </Text>
    </div>
  );
}
