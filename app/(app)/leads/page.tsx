"use client";

import { useMemo, useState } from "react";
import { Button, Group, Loader, Modal, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconFileImport, IconPlus } from "@tabler/icons-react";
import { useCreateLead, useLeads } from "@/hooks/useLeads";
import { useTiposServico } from "@/hooks/useServicos";
import { useTeamMembers } from "@/hooks/useCurrentMember";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadFilters, type LeadFiltersValue } from "@/components/leads/LeadFilters";
import { LeadDetailModal } from "@/components/leads/LeadDetailModal";
import { ImportarLeads } from "@/components/leads/ImportarLeads";
import { LeadForm } from "@/components/leads/LeadForm";
import { SearchInput } from "@/components/shared/SearchInput";
import { leadMatchesQuery } from "@/lib/search";
import type { Lead } from "@/types/lead";

/** Valores distintos e ordenados de um campo texto, para alimentar um Select. */
function distinct(leads: Lead[], pick: (lead: Lead) => string | null): string[] {
  return Array.from(new Set(leads.map(pick).filter((v): v is string => !!v))).sort();
}

export default function LeadsPage() {
  const { data: leads, isLoading, error } = useLeads();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LeadFiltersValue>({
    stage: null,
    origem: null,
    cidade: null,
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [importando, { open: abrirImportacao, close: fecharImportacao }] = useDisclosure(false);
  const [newOpened, { open: openNew, close: closeNew }] = useDisclosure(false);
  const createLead = useCreateLead();
  const { data: tipos } = useTiposServico();
  const { data: membros } = useTeamMembers();

  const origemOptions = useMemo(() => (leads ? distinct(leads, (l) => l.origem) : []), [leads]);
  const cidadeOptions = useMemo(() => (leads ? distinct(leads, (l) => l.cidade) : []), [leads]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter((lead) => {
      if (filters.stage && lead.pipelineStage !== filters.stage) return false;
      if (filters.origem && lead.origem !== filters.origem) return false;
      if (filters.cidade && lead.cidade !== filters.cidade) return false;
      if (!leadMatchesQuery(lead, search)) return false;
      return true;
    });
  }, [leads, filters, search]);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Leads</Title>
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<IconFileImport size={16} />}
            onClick={abrirImportacao}
          >
            Importar
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openNew}>
          Novo lead
          </Button>
        </Group>
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
          <LeadFilters
            value={filters}
            onChange={setFilters}
            origemOptions={origemOptions}
            cidadeOptions={cidadeOptions}
          />
          <LeadsTable leads={filteredLeads} onRowClick={setSelectedLead} />
        </>
      )}

      <ImportarLeads opened={importando} onClose={fecharImportacao} />

      <LeadDetailModal
        // Relê a versão do cache para o modal refletir edições sem reabrir.
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />

      <Modal opened={newOpened} onClose={closeNew} title={<Title order={3}>Novo lead</Title>} size="lg">
        <LeadForm
          tipos={tipos ?? []}
          membros={membros ?? []}
          submitting={createLead.isPending}
          submitLabel="Criar lead"
          onSubmit={(input) => createLead.mutate(input, { onSuccess: closeNew })}
        />
      </Modal>
    </Stack>
  );
}
