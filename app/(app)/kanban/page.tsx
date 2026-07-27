"use client";

import { useMemo, useState } from "react";
import { Loader, Stack, Text, Title } from "@mantine/core";
import { useLeads } from "@/hooks/useLeads";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadDetailModal } from "@/components/leads/LeadDetailModal";
import { SearchInput } from "@/components/shared/SearchInput";
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
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por empresa, contato, cidade, telefone, CNPJ..."
          />
          <KanbanBoard leads={filteredLeads} onCardClick={setSelectedLead} />
        </>
      )}

      <LeadDetailModal
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}
