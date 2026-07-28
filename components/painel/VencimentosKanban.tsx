"use client";

import { useRouter } from "next/navigation";
import { Badge, Card, Group, Paper, ScrollArea, Stack, Text, Title } from "@mantine/core";
import dayjs from "dayjs";
import {
  SITUACAO_LABELS,
  SITUACOES_KANBAN,
  type ClienteComSituacao,
  type SituacaoCliente,
} from "@/lib/vencimentos";
import { nomeCliente } from "@/types/cliente";

/**
 * Quadro de conformidade da carteira: uma coluna por situação, um card por
 * cliente.
 *
 * Não tem drag-and-drop de propósito, ao contrário do kanban de leads: a coluna
 * aqui é derivada da data de vencimento, não uma decisão de alguém. Arrastar um
 * cliente de "Vencido" para "Em dia" seria mentir para o sistema — o jeito de
 * mudar de coluna é registrar o serviço novo.
 */
export function VencimentosKanban({
  grupos,
}: {
  grupos: Record<SituacaoCliente, ClienteComSituacao[]>;
}) {
  const total = SITUACOES_KANBAN.reduce((sum, s) => sum + grupos[s].length, 0);

  if (total === 0) {
    return (
      <Paper withBorder p="lg" radius="md">
        <Text c="dimmed">
          Nenhum cliente ativo com serviço que vence ainda. Registre um serviço com data de
          vencimento para o acompanhamento começar.
        </Text>
      </Paper>
    );
  }

  return (
    <ScrollArea>
      <Group align="flex-start" gap="md" wrap="nowrap" style={{ minWidth: 720 }}>
        {SITUACOES_KANBAN.map((situacao) => {
          const meta = SITUACAO_LABELS[situacao];
          const clientes = grupos[situacao];

          return (
            <Paper
              key={situacao}
              withBorder
              p="sm"
              radius="md"
              style={{ flex: 1, minWidth: 220, alignSelf: "stretch" }}
            >
              <Group gap="xs" mb="sm">
                <Title order={5} c={meta.color}>
                  {meta.label}
                </Title>
                <Badge color={meta.color} variant="light" size="sm">
                  {clientes.length}
                </Badge>
              </Group>

              <Stack gap="xs">
                {clientes.length === 0 ? (
                  <Text size="xs" c="dimmed">
                    Nenhum cliente aqui.
                  </Text>
                ) : (
                  clientes.map((item) => (
                    <ClienteCard key={item.cliente.id} item={item} color={meta.color} />
                  ))
                )}
              </Stack>
            </Paper>
          );
        })}
      </Group>
    </ScrollArea>
  );
}

function ClienteCard({ item, color }: { item: ClienteComSituacao; color: string }) {
  const router = useRouter();
  const dias = item.proximoVencimento
    ? dayjs(item.proximoVencimento).diff(dayjs().startOf("day"), "day")
    : null;

  return (
    <Card
      withBorder
      padding="xs"
      radius="sm"
      onClick={() => router.push(`/clientes/${item.cliente.id}`)}
      style={{ cursor: "pointer" }}
    >
      <Text size="sm" fw={500} lineClamp={2}>
        {nomeCliente(item.cliente)}
      </Text>
      {item.proximoVencimento && (
        <Text size="xs" c={color} mt={2}>
          {dayjs(item.proximoVencimento).format("DD/MM/YYYY")}
          {dias !== null &&
            ` · ${
              dias < 0
                ? `há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
                : dias === 0
                  ? "hoje"
                  : `em ${dias} ${dias === 1 ? "dia" : "dias"}`
            }`}
        </Text>
      )}
    </Card>
  );
}
