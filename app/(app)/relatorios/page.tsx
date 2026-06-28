"use client";

import { useMemo } from "react";
import { Card, Group, Loader, Progress, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useLeads } from "@/hooks/useLeads";
import { computeReports, type CountItem } from "@/lib/reports";

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card withBorder padding="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={700} c={color}>
        {value}
      </Text>
    </Card>
  );
}

function BreakdownCard({ title, items }: { title: string; items: CountItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card withBorder padding="md">
      <Text fw={600} mb="sm">
        {title}
      </Text>
      <Stack gap="xs">
        {items.map((item) => (
          <div key={item.key}>
            <Group justify="space-between" gap="xs">
              <Text size="sm">{item.label}</Text>
              <Text size="sm" fw={500}>
                {item.count}
              </Text>
            </Group>
            <Progress value={(item.count / max) * 100} size="sm" mt={2} />
          </div>
        ))}
      </Stack>
    </Card>
  );
}

export default function RelatoriosPage() {
  const { data: leads, isLoading, error } = useLeads();
  const reports = useMemo(() => (leads ? computeReports(leads) : null), [leads]);

  if (isLoading) return <Loader />;
  if (error) return <Text c="red">Erro ao carregar relatórios.</Text>;
  if (!reports) return null;

  return (
    <Stack>
      <Title order={2}>Relatórios</Title>

      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }}>
        <StatCard label="Total de leads" value={reports.total} />
        <StatCard label="Clientes (fechados)" value={reports.clientes} color="green" />
        <StatCard label="Em andamento" value={reports.emAndamento} />
        <StatCard label="Perdidos" value={reports.perdidos} color="red" />
        <StatCard label="Taxa de conversão" value={`${reports.taxaConversao}%`} color="blue" />
        <StatCard label="AVCB vencidos" value={reports.avcbVencidos} color="red" />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <BreakdownCard title="Funil de vendas (por etapa)" items={reports.porEtapa} />
        <BreakdownCard title="Status do AVCB" items={reports.porAvcb} />
      </SimpleGrid>

      <BreakdownCard title="Top 10 categorias" items={reports.porCategoria} />
    </Stack>
  );
}
