"use client";

import { useMemo } from "react";
import { Loader, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useLeads } from "@/hooks/useLeads";
import { BreakdownCard, StatCard } from "@/components/shared/StatCard";
import { computeReports } from "@/lib/reports";

export default function RelatoriosPage() {
  const { data: leads, isLoading, error } = useLeads();
  const reports = useMemo(() => (leads ? computeReports(leads) : null), [leads]);

  if (isLoading) return <Loader />;
  if (error) return <Text c="red">Erro ao carregar relatórios.</Text>;
  if (!reports) return null;

  return (
    <Stack>
      <Title order={2}>Relatórios comerciais</Title>

      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }}>
        <StatCard label="Total de leads" value={reports.total} />
        <StatCard label="Em andamento" value={reports.emAndamento} />
        <StatCard label="Ganhos" value={reports.ganhos} color="green" />
        <StatCard label="Perdidos" value={reports.perdidos} color="red" />
        <StatCard label="Taxa de conversão" value={`${reports.taxaConversao}%`} color="blue" />
      </SimpleGrid>

      <StatCard
        label="Valor estimado em aberto"
        value={reports.valorEmAberto.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
        hint="Soma dos leads que ainda não foram ganhos nem perdidos"
      />

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <BreakdownCard title="Funil de vendas (por etapa)" items={reports.porEtapa} />
        <BreakdownCard title="Origem dos leads" items={reports.porOrigem} />
      </SimpleGrid>
    </Stack>
  );
}
