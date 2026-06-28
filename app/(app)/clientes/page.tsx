"use client";

import { useMemo, useState } from "react";
import { Loader, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useLeads } from "@/hooks/useLeads";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { leadMatchesQuery } from "@/lib/search";
import type { Lead } from "@/types/lead";

export default function ClientesPage() {
  const { data: leads, isLoading, error } = useLeads();
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // "Clientes" são os leads com contrato fechado (etapa Fechado/Ganho).
  const clientes = useMemo(() => {
    if (!leads) return [];
    return leads
      .filter((l) => l.pipelineStage === "fechado_ganho")
      .filter((l) => leadMatchesQuery(l, search));
  }, [leads, search]);

  return (
    <Stack>
      <Title order={2}>Clientes</Title>
      <Text c="dimmed" size="sm">
        Leads com contrato fechado (etapa &quot;Fechado (Ganho)&quot;).
      </Text>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar clientes.</Text>}

      {leads && (
        <>
          <TextInput
            placeholder="Buscar por nome, cidade, categoria, telefone, CNPJ..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <LeadsTable leads={clientes} onRowClick={setSelectedLead} />
        </>
      )}

      <LeadDetailDrawer
        lead={selectedLead ? (leads?.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}
