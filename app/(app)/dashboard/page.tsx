"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Anchor, Badge, Card, Group, Loader, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useLeads } from "@/hooks/useLeads";
import { useClientes } from "@/hooks/useClientes";
import { useServicos, useTiposServico } from "@/hooks/useServicos";
import { useSolicitacoesExclusao } from "@/hooks/useExclusoes";
import { StatCard } from "@/components/shared/StatCard";
import { LeadDetailModal } from "@/components/leads/LeadDetailModal";
import { FollowUpList } from "@/components/leads/FollowUpList";
import { VencimentosKanban } from "@/components/painel/VencimentosKanban";
import { JornadaControl } from "@/components/jornada/JornadaControl";
import { MetasProgresso } from "@/components/metas/MetasProgresso";
import { PENDENCIA_LABELS, computePainel } from "@/lib/painel";
import { clientesPorSituacao, itensVenciveis } from "@/lib/vencimentos";
import type { Lead } from "@/types/lead";

export default function PainelPage() {
  const router = useRouter();
  const { data: leads, isLoading } = useLeads();
  const { data: clientes } = useClientes();
  const { data: servicos } = useServicos();
  const { data: tipos } = useTiposServico();
  const { data: solicitacoes } = useSolicitacoesExclusao();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const painel = useMemo(
    () =>
      computePainel({
        clientes: clientes ?? [],
        servicos: servicos ?? [],
        tipos: tipos ?? [],
        leads: leads ?? [],
        solicitacoes: solicitacoes ?? [],
      }),
    [clientes, servicos, tipos, leads, solicitacoes],
  );

  const grupos = useMemo(
    () => clientesPorSituacao(clientes ?? [], itensVenciveis(servicos ?? [], clientes ?? [])),
    [clientes, servicos],
  );

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={2}>Painel</Title>
        <JornadaControl />
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }}>
        <StatCard label="Clientes ativos" value={painel.clientesAtivos} />
        <StatCard label="Serviços realizados" value={painel.servicosRealizados} />
        <StatCard label="Agendados" value={painel.servicosAgendados} color="blue" />
        <StatCard
          label="Próximos vencimentos"
          value={painel.proximosVencimentos}
          color="orange"
          hint="Próximos 30 dias"
        />
        <StatCard label="Já venceram" value={painel.vencidos} color="red" />
      </SimpleGrid>

      <MetasProgresso compacto />

      <Group mt="md" justify="space-between">
        <Title order={3}>Conformidade da carteira</Title>
        <Anchor size="sm" onClick={() => router.push("/servicos")}>
          Ver todos os serviços
        </Anchor>
      </Group>
      <VencimentosKanban grupos={grupos} />

      <Group mt="md">
        <Title order={3}>Retornos</Title>
      </Group>
      <FollowUpList
        leads={leads ?? []}
        onLeadClick={setSelectedLead}
        buckets={["atrasado", "hoje", "proximos"]}
        emptyMessage="Nenhum retorno para os próximos dias. Veja todos na Agenda."
      />

      <Group mt="md" gap="xs">
        <Title order={3}>Pendências</Title>
        {painel.pendencias.length > 0 && (
          <Badge color="gray" variant="light">
            {painel.pendencias.length}
          </Badge>
        )}
      </Group>

      {painel.pendencias.length === 0 ? (
        <Text c="dimmed">Nada pendente. Tudo em dia.</Text>
      ) : (
        <Stack gap="xs">
          {painel.pendencias.map((pendencia) => {
            const meta = PENDENCIA_LABELS[pendencia.tipo];
            return (
              <Card
                key={pendencia.id}
                withBorder
                padding="sm"
                radius="md"
                onClick={() => router.push(pendencia.href)}
                style={{ cursor: "pointer" }}
              >
                <Group gap="sm" wrap="nowrap">
                  <Badge color={meta.color} variant="light" style={{ flexShrink: 0 }}>
                    {meta.label}
                  </Badge>
                  <Text size="sm">{pendencia.descricao}</Text>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}

      <LeadDetailModal
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}
