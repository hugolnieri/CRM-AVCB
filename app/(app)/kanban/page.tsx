"use client";

import { useState } from "react";
import { Loader, Stack, Text, Title } from "@mantine/core";
import { useLeads } from "@/hooks/useLeads";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import type { Lead } from "@/types/lead";

export default function KanbanPage() {
  const { data: leads, isLoading, error } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <Stack>
      <Title order={2}>Pipeline</Title>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar leads.</Text>}

      {leads && <KanbanBoard leads={leads} onCardClick={setSelectedLead} />}

      <LeadDetailDrawer
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}
