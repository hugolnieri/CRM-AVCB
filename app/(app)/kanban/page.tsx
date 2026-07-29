"use client";

import { useMemo, useState } from "react";
import { Group, Loader, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { IconLayoutKanban, IconList, IconMap } from "@tabler/icons-react";
import { useLeads } from "@/hooks/useLeads";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadDetailModal } from "@/components/leads/LeadDetailModal";
import { PipelineLista } from "@/components/leads/PipelineLista";
import { PipelineMapa } from "@/components/leads/PipelineMapa";
import { SearchInput } from "@/components/shared/SearchInput";
import { leadMatchesQuery } from "@/lib/search";
import type { Lead } from "@/types/lead";

type Visualizacao = "kanban" | "lista" | "mapa";

export default function KanbanPage() {
  const { data: leads, isLoading, error } = useLeads();
  const [search, setSearch] = useState("");
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("kanban");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter((lead) => leadMatchesQuery(lead, search));
  }, [leads, search]);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Pipeline</Title>
        {/* A busca vale para as três visualizações: o que muda é o desenho, não
            o conjunto de leads. */}
        <SegmentedControl
          value={visualizacao}
          onChange={(value) => setVisualizacao(value as Visualizacao)}
          data={[
            {
              value: "kanban",
              label: (
                <Group gap={6} wrap="nowrap">
                  <IconLayoutKanban size={16} />
                  <span>Kanban</span>
                </Group>
              ),
            },
            {
              value: "lista",
              label: (
                <Group gap={6} wrap="nowrap">
                  <IconList size={16} />
                  <span>Lista</span>
                </Group>
              ),
            },
            {
              value: "mapa",
              label: (
                <Group gap={6} wrap="nowrap">
                  <IconMap size={16} />
                  <span>Mapa</span>
                </Group>
              ),
            },
          ]}
        />
      </Group>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar leads.</Text>}

      {leads && (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por empresa, contato, cidade, telefone, CNPJ..."
          />
          {visualizacao === "kanban" && (
            <KanbanBoard leads={filteredLeads} onCardClick={setSelectedLead} />
          )}
          {visualizacao === "lista" && (
            <PipelineLista leads={filteredLeads} onRowClick={setSelectedLead} />
          )}
          {visualizacao === "mapa" && (
            <PipelineMapa leads={filteredLeads} onLeadClick={setSelectedLead} />
          )}
        </>
      )}

      <LeadDetailModal
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}
