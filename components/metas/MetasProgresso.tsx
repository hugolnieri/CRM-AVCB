"use client";

import { useMemo } from "react";
import { Badge, Card, Group, Progress, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconTargetArrow } from "@tabler/icons-react";
import { useMetas } from "@/hooks/useMetas";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { useLeads } from "@/hooks/useLeads";
import { useServicos } from "@/hooks/useServicos";
import { useActivitiesRecentes } from "@/hooks/useActivities";
import { corDoProgresso, progressoDoMembro, type ProgressoMeta } from "@/lib/metas";
import { METRICA_LABELS, PERIODO_LABELS } from "@/types/meta";

/** "R$ 5.000" para valor, "12 leads" para o resto. */
function formatarValor(valor: number, metrica: ProgressoMeta["meta"]["metrica"]): string {
  if (metrica === "valor_fechado") {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
  }
  return String(valor);
}

/**
 * Metas do usuário logado, com progresso apurado na hora.
 *
 * Aparece na Agenda e no Painel — os dois lugares em que a pessoa começa o dia.
 * Deliberadamente NÃO vira evento no calendário: uma meta diária marcaria todos
 * os dias do mês e afogaria os compromissos reais.
 */
export function MetasProgresso({ compacto = false }: { compacto?: boolean }) {
  const { data: member } = useCurrentMember();
  const { data: metas } = useMetas();
  const { data: leads } = useLeads();
  const { data: servicos } = useServicos();
  // 31 dias cobre a maior janela possível (mensal) sem carregar o histórico todo.
  const { data: activities } = useActivitiesRecentes(31);

  const progressos = useMemo(() => {
    if (!member || !metas) return [];
    return progressoDoMembro(metas, member.id, {
      activities: activities ?? [],
      leads: leads ?? [],
      servicos: servicos ?? [],
    });
  }, [member, metas, activities, leads, servicos]);

  if (progressos.length === 0) return null;

  return (
    <Stack gap="xs">
      <Group gap="xs">
        <IconTargetArrow size={18} />
        <Title order={compacto ? 5 : 4}>Minhas metas</Title>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: compacto ? 2 : 3 }}>
        {progressos.map((p) => (
          <MetaCard key={p.meta.id} progresso={p} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function MetaCard({ progresso }: { progresso: ProgressoMeta }) {
  const { meta, realizado, alvo, percentual, cumprida } = progresso;
  const metrica = METRICA_LABELS[meta.metrica];
  const periodo = PERIODO_LABELS[meta.periodo];
  const cor = corDoProgresso(percentual);

  return (
    <Card withBorder padding="sm" radius="md">
      <Group justify="space-between" wrap="nowrap" mb={4}>
        <Text size="sm" fw={500} lineClamp={1}>
          {meta.nome}
        </Text>
        {cumprida && (
          <Badge color="green" variant="light" size="sm" style={{ flexShrink: 0 }}>
            Cumprida
          </Badge>
        )}
      </Group>

      <Text size="xs" c="dimmed" mb={6}>
        {metrica.label} · {periodo.adjetivo}
        {meta.memberId === null && " · meta da equipe"}
      </Text>

      <Progress value={percentual} color={cor} size="lg" radius="sm" />

      <Group justify="space-between" mt={4}>
        <Text size="sm" fw={600} c={cor}>
          {formatarValor(realizado, meta.metrica)}
          <Text span size="xs" c="dimmed" fw={400}>
            {" "}
            / {formatarValor(alvo, meta.metrica)}
          </Text>
        </Text>
        <Text size="xs" c="dimmed">
          {percentual}%
        </Text>
      </Group>
    </Card>
  );
}

export { formatarValor };
