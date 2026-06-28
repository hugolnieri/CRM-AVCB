"use client";

import { useMemo, useState } from "react";
import { Loader, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useLeads } from "@/hooks/useLeads";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { leadMatchesQuery } from "@/lib/search";
import type { Lead } from "@/types/lead";

export default function KanbanPage() {
  const { data: leads, isLoading, error } = useLeads();
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter((lead) => leadMatchesQuery(lead, search));
  }, [leads, search]);

  return (
    <Stack>
      <Title order={2}>Pipeline</Title>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar leads.</Text>}

      {leads && (
        <>
          <TextInput
            placeholder="Buscar por nome, cidade, categoria, telefone, CNPJ..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <KanbanBoard leads={filteredLeads} onCardClick={setSelectedLead} />
        </>
      )}

      <LeadDetailDrawer
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}
