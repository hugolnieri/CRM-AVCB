"use client";

import { useState } from "react";
import { Loader, Stack, Text, Title } from "@mantine/core";
import { useLeads } from "@/hooks/useLeads";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { FollowUpList } from "@/components/leads/FollowUpList";
import type { Lead } from "@/types/lead";

export default function AgendaPage() {
  const { data: leads, isLoading, error } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <Stack>
      <Title order={2}>Agenda de retornos</Title>
      <Text c="dimmed" size="sm">
        Todos os follow-ups agendados, do mais urgente ao mais distante. Clique para abrir o lead.
      </Text>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar a agenda.</Text>}

      {leads && (
        <FollowUpList
          leads={leads}
          onLeadClick={setSelectedLead}
          emptyMessage="Nenhum retorno agendado. Abra um lead e use 'Retornar em' para agendar."
        />
      )}

      <LeadDetailDrawer
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}
