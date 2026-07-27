"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Anchor, Badge, Card, Group, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import { IconCertificate, IconTool } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useLeads } from "@/hooks/useLeads";
import { useClientes } from "@/hooks/useClientes";
import { useTreinamentos } from "@/hooks/useTreinamentos";
import { useServicos } from "@/hooks/useServicos";
import { LeadDetailModal } from "@/components/leads/LeadDetailModal";
import { FollowUpList } from "@/components/leads/FollowUpList";
import { AgendaCalendar, type Marcador } from "@/components/shared/AgendaCalendar";
import { leadsWithFollowUp } from "@/lib/followup";
import { itensVenciveis } from "@/lib/vencimentos";
import type { Lead } from "@/types/lead";

export default function AgendaPage() {
  const router = useRouter();
  const { data: leads, isLoading, error } = useLeads();
  const { data: clientes } = useClientes();
  const { data: treinamentos } = useTreinamentos();
  const { data: servicos } = useServicos();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const itens = useMemo(
    () => itensVenciveis(treinamentos ?? [], servicos ?? [], clientes ?? []),
    [treinamentos, servicos, clientes],
  );

  const marcadores = useMemo<Marcador[]>(() => {
    // follow_up_at é timestamptz, então precisa virar dia local aqui. Já as
    // datas de vencimento são `date` puro e passam intactas — ver AgendaCalendar.
    const retornos: Marcador[] = leadsWithFollowUp(leads ?? []).map((l) => ({
      date: dayjs(l.followUpAt).format("YYYY-MM-DD"),
      tipo: "retorno",
    }));
    const vencimentos: Marcador[] = itens.map((i) => ({
      date: i.dataVencimento,
      tipo: "vencimento",
    }));
    return [...retornos, ...vencimentos];
  }, [leads, itens]);

  const listLeads = useMemo(() => {
    if (!leads) return [];
    if (!selectedDay) return leads;
    return leads.filter(
      (l) => l.followUpAt && dayjs(l.followUpAt).format("YYYY-MM-DD") === selectedDay,
    );
  }, [leads, selectedDay]);

  const vencimentosDoDia = useMemo(
    () => (selectedDay ? itens.filter((i) => i.dataVencimento === selectedDay) : []),
    [itens, selectedDay],
  );

  return (
    <Stack>
      <Title order={2}>Agenda</Title>
      <Text c="dimmed" size="sm">
        Azul: retorno de lead agendado. Laranja: treinamento ou serviço vencendo. Vermelho: já
        passou. Clique num dia para filtrar.
      </Text>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar a agenda.</Text>}

      {leads && (
        <Stack>
          <Paper withBorder p="md" radius="md">
            <AgendaCalendar
              marcadores={marcadores}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          </Paper>

          {selectedDay && (
            <Group justify="space-between">
              <Text fw={500}>{dayjs(selectedDay).format("DD/MM/YYYY")}</Text>
              <Anchor component="button" type="button" onClick={() => setSelectedDay(null)}>
                Ver todos
              </Anchor>
            </Group>
          )}

          {vencimentosDoDia.length > 0 && (
            <Stack gap="xs">
              <Group gap="xs">
                <Title order={5}>Vencimentos</Title>
                <Badge color="orange" variant="light">
                  {vencimentosDoDia.length}
                </Badge>
              </Group>
              {vencimentosDoDia.map((item) => (
                <Card
                  key={`${item.origem}-${item.id}`}
                  withBorder
                  padding="sm"
                  radius="md"
                  onClick={() => router.push(`/clientes/${item.clienteId}`)}
                  style={{ cursor: "pointer" }}
                >
                  <Group gap="sm" wrap="nowrap">
                    {item.origem === "treinamento" ? (
                      <IconCertificate size={18} />
                    ) : (
                      <IconTool size={18} />
                    )}
                    <div>
                      <Text fw={500} size="sm">
                        {item.clienteNome}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {item.descricao}
                      </Text>
                    </div>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}

          <Title order={5}>Retornos</Title>
          <FollowUpList
            leads={listLeads}
            onLeadClick={setSelectedLead}
            emptyMessage={
              selectedDay
                ? "Nenhum retorno neste dia."
                : "Nenhum retorno agendado. Abra um lead e use 'Retornar em' para agendar."
            }
          />
        </Stack>
      )}

      <LeadDetailModal
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}
