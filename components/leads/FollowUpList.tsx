"use client";

import { Badge, Card, Group, Stack, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import dayjs from "dayjs";
import { followUpBucket, leadsWithFollowUp, type FollowUpBucket } from "@/lib/followup";
import type { Lead } from "@/types/lead";

const BUCKET_META: Record<
  FollowUpBucket,
  { label: string; color: string }
> = {
  atrasado: { label: "Atrasados", color: "red" },
  hoje: { label: "Hoje", color: "orange" },
  proximos: { label: "Próximos 7 dias", color: "yellow" },
  futuro: { label: "Mais adiante", color: "gray" },
};

interface Props {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  /** Quais baldes exibir. O dashboard omite "futuro"; a agenda mostra tudo. */
  buckets?: FollowUpBucket[];
  /** Texto quando não há nenhum retorno nos baldes pedidos. */
  emptyMessage?: string;
}

export function FollowUpList({
  leads,
  onLeadClick,
  buckets = ["atrasado", "hoje", "proximos", "futuro"],
  emptyMessage = "Nenhum retorno agendado.",
}: Props) {
  const withFollowUp = leadsWithFollowUp(leads);
  const now = dayjs();

  const grouped = buckets
    .map((bucket) => ({
      bucket,
      leads: withFollowUp.filter((l) => followUpBucket(l.followUpAt, now) === bucket),
    }))
    .filter((g) => g.leads.length > 0);

  if (grouped.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <Stack gap="md">
      {grouped.map(({ bucket, leads: bucketLeads }) => {
        const meta = BUCKET_META[bucket];
        return (
          <Stack key={bucket} gap="xs">
            <Group gap="xs">
              <Badge color={meta.color} variant="light">
                {meta.label}
              </Badge>
              <Text size="xs" c="dimmed">
                {bucketLeads.length}
              </Text>
            </Group>
            {bucketLeads.map((lead) => (
              <Card
                key={lead.id}
                withBorder
                padding="sm"
                radius="md"
                onClick={() => onLeadClick(lead)}
                style={{ cursor: "pointer" }}
              >
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <div style={{ minWidth: 0 }}>
                    <Text fw={500} size="sm" truncate>
                      {lead.name}
                    </Text>
                    {lead.followUpNote && (
                      <Text size="xs" c="dimmed" style={{ wordBreak: "break-word" }}>
                        {lead.followUpNote}
                      </Text>
                    )}
                  </div>
                  <Group gap={4} wrap="nowrap" c={meta.color}>
                    <IconClock size={14} />
                    <Text size="xs" fw={500} style={{ whiteSpace: "nowrap" }}>
                      {dayjs(lead.followUpAt).format("DD/MM HH:mm")}
                    </Text>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        );
      })}
    </Stack>
  );
}
