"use client";

import { useMemo, useState } from "react";
import { Card, Group, Loader, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import dayjs from "dayjs";
import { useLeads } from "@/hooks/useLeads";
import { PIPELINE_STAGES } from "@/lib/pipeline/stages";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { FollowUpList } from "@/components/leads/FollowUpList";
import type { Lead } from "@/types/lead";

export default function DashboardPage() {
  const { data: leads, isLoading } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const stageCounts = useMemo(() => {
    if (!leads) return [];
    return PIPELINE_STAGES.map((stage) => ({
      label: stage.label,
      count: leads.filter((l) => l.pipelineStage === stage.value).length,
    }));
  }, [leads]);

  const overdueLeads = useMemo(() => {
    if (!leads) return [];
    return leads
      .filter((l) => l.avcbStatus === "vencido")
      .sort((a, b) => {
        if (!a.avcbValidade) return 1;
        if (!b.avcbValidade) return -1;
        return dayjs(a.avcbValidade).diff(dayjs(b.avcbValidade));
      });
  }, [leads]);

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Title order={2}>Dashboard</Title>

      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }}>
        {stageCounts.map((s) => (
          <Card key={s.label} withBorder padding="md">
            <Text size="xs" c="dimmed">
              {s.label}
            </Text>
            <Text size="xl" fw={700}>
              {s.count}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      <Group mt="md">
        <Title order={3}>Retornos</Title>
      </Group>

      <FollowUpList
        leads={leads ?? []}
        onLeadClick={setSelectedLead}
        buckets={["atrasado", "hoje", "proximos"]}
        emptyMessage="Nenhum retorno para os próximos dias. Veja todos na aba Agenda."
      />

      <Group mt="md">
        <Title order={3} c="red">
          AVCB Vencido — Ação Urgente
        </Title>
      </Group>

      <LeadsTable leads={overdueLeads} onRowClick={setSelectedLead} />

      <LeadDetailDrawer
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}
