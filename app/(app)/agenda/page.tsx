"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCalendarPlus } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useLeads } from "@/hooks/useLeads";
import { useClientes } from "@/hooks/useClientes";
import { useCreateServico, useServicos, useTiposServico } from "@/hooks/useServicos";
import { useTeamMembers } from "@/hooks/useCurrentMember";
import { LeadDetailModal } from "@/components/leads/LeadDetailModal";
import { FollowUpList } from "@/components/leads/FollowUpList";
import { ServicoForm } from "@/components/servicos/ServicoForm";
import { MetasProgresso } from "@/components/metas/MetasProgresso";
import {
  AgendaCalendar,
  EVENTO_CORES,
  type EventoAgenda,
} from "@/components/shared/AgendaCalendar";
import { leadsWithFollowUp } from "@/lib/followup";
import { itensVenciveis } from "@/lib/vencimentos";
import { nomeCliente } from "@/types/cliente";
import type { Lead } from "@/types/lead";

export default function AgendaPage() {
  const router = useRouter();
  const { data: leads, isLoading, error } = useLeads();
  const { data: clientes } = useClientes();
  const { data: servicos } = useServicos();
  const { data: tipos } = useTiposServico();
  const { data: membros } = useTeamMembers();

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [mes, setMes] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [agendarOpened, { open: abrirAgendar, close: fecharAgendar }] = useDisclosure(false);
  const createServico = useCreateServico();

  const eventos = useMemo<EventoAgenda[]>(() => {
    const nomePorId = new Map((clientes ?? []).map((c) => [c.id, nomeCliente(c)]));

    // follow_up_at é timestamptz, então precisa virar dia local aqui.
    const retornos: EventoAgenda[] = leadsWithFollowUp(leads ?? []).map((l) => ({
      id: `retorno-${l.id}`,
      date: dayjs(l.followUpAt).format("YYYY-MM-DD"),
      hora: dayjs(l.followUpAt).format("HH:mm"),
      tipo: "retorno",
      titulo: l.name,
      onClick: () => setSelectedLead(l),
    }));

    // Compromissos: também timestamptz.
    const agendados: EventoAgenda[] = (servicos ?? [])
      .filter((s) => s.status === "agendado" && s.dataAgendada)
      .map((s) => ({
        id: `agendado-${s.id}`,
        date: dayjs(s.dataAgendada).format("YYYY-MM-DD"),
        hora: dayjs(s.dataAgendada).format("HH:mm"),
        tipo: "agendado",
        titulo: `${s.tipoNome} · ${nomePorId.get(s.clienteId) ?? ""}`,
        onClick: () => router.push(`/clientes/${s.clienteId}`),
      }));

    // Vencimentos são `date` puro: passam intactos, sem reformatar (fuso).
    const vencimentos: EventoAgenda[] = itensVenciveis(servicos ?? [], clientes ?? []).map((i) => ({
      id: `vencimento-${i.id}`,
      date: i.dataVencimento,
      tipo: "vencimento",
      titulo: `${i.descricao} · ${i.clienteNome}`,
      onClick: () => router.push(`/clientes/${i.clienteId}`),
    }));

    return [...retornos, ...agendados, ...vencimentos];
  }, [leads, servicos, clientes, router]);

  const doDia = useMemo(
    () => (selectedDay ? eventos.filter((e) => e.date === selectedDay) : []),
    [eventos, selectedDay],
  );

  const listLeads = useMemo(() => {
    if (!leads) return [];
    if (!selectedDay) return leads;
    return leads.filter(
      (l) => l.followUpAt && dayjs(l.followUpAt).format("YYYY-MM-DD") === selectedDay,
    );
  }, [leads, selectedDay]);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Agenda</Title>
        <Button leftSection={<IconCalendarPlus size={16} />} onClick={abrirAgendar}>
          Agendar serviço
        </Button>
      </Group>

      <MetasProgresso />

      <Group gap="lg">
        <Legenda cor={EVENTO_CORES.agendado} texto="Serviço agendado" />
        <Legenda cor={EVENTO_CORES.retorno} texto="Retorno de lead" />
        <Legenda cor={EVENTO_CORES.vencimento} texto="Vencimento" />
      </Group>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar a agenda.</Text>}

      {leads && (
        <Stack>
          <Paper withBorder p="md" radius="md">
            <AgendaCalendar
              eventos={eventos}
              mes={mes}
              onMesChange={setMes}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          </Paper>

          {selectedDay && (
            <>
              <Group justify="space-between">
                <Text fw={500}>{dayjs(selectedDay).format("DD/MM/YYYY")}</Text>
                <Anchor component="button" type="button" onClick={() => setSelectedDay(null)}>
                  Ver todos
                </Anchor>
              </Group>

              {doDia.length === 0 ? (
                <Text c="dimmed">Nada neste dia.</Text>
              ) : (
                <Stack gap="xs">
                  {doDia.map((evento) => (
                    <Card
                      key={evento.id}
                      withBorder
                      padding="sm"
                      radius="md"
                      onClick={evento.onClick}
                      style={{ cursor: evento.onClick ? "pointer" : undefined }}
                    >
                      <Group gap="sm" wrap="nowrap">
                        <Badge color={EVENTO_CORES[evento.tipo]} variant="light" style={{ flexShrink: 0 }}>
                          {evento.hora ?? "dia todo"}
                        </Badge>
                        <Text size="sm">{evento.titulo}</Text>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </>
          )}

          <Title order={5} mt="md">
            Retornos
          </Title>
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

      <Modal
        opened={agendarOpened}
        onClose={fecharAgendar}
        title={<Title order={3}>Agendar serviço</Title>}
        size="lg"
      >
        <ServicoForm
          clientes={clientes ?? []}
          tipos={tipos ?? []}
          membros={membros ?? []}
          statusInicial="agendado"
          submitting={createServico.isPending}
          submitLabel="Agendar"
          onSubmit={(input) => createServico.mutate(input, { onSuccess: fecharAgendar })}
        />
      </Modal>

      <LeadDetailModal
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <Group gap={6}>
      <Badge color={cor} variant="filled" circle size="xs" />
      <Text size="xs" c="dimmed">
        {texto}
      </Text>
    </Group>
  );
}
