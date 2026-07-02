"use client";

import { useMemo, useState } from "react";
import { Anchor, Group, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import dayjs from "dayjs";
import { useLeads } from "@/hooks/useLeads";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { FollowUpList } from "@/components/leads/FollowUpList";
import { FollowUpCalendar } from "@/components/leads/FollowUpCalendar";
import type { Lead } from "@/types/lead";

export default function AgendaPage() {
  const { data: leads, isLoading, error } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Quando um dia é selecionado no calendário, a lista mostra só os retornos daquele dia.
  const listLeads = useMemo(() => {
    if (!leads) return [];
    if (!selectedDay) return leads;
    return leads.filter(
      (l) => l.followUpAt && dayjs(l.followUpAt).format("YYYY-MM-DD") === selectedDay,
    );
  }, [leads, selectedDay]);

  return (
    <Stack>
      <Title order={2}>Agenda de retornos</Title>
      <Text c="dimmed" size="sm">
        Dias com retorno agendado aparecem marcados no calendário. Clique num dia para filtrar, ou
        veja a lista completa abaixo. Clique num retorno para abrir o lead.
      </Text>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar a agenda.</Text>}

      {leads && (
        <Stack>
          <Paper withBorder p="md" radius="md">
            <FollowUpCalendar
              leads={leads}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          </Paper>

          {selectedDay && (
            <Group justify="space-between">
              <Text fw={500}>Retornos de {dayjs(selectedDay).format("DD/MM/YYYY")}</Text>
              <Anchor component="button" type="button" onClick={() => setSelectedDay(null)}>
                Ver todos
              </Anchor>
            </Group>
          )}

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

      <LeadDetailDrawer
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}
