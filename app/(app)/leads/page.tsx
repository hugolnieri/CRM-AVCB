"use client";

import { useMemo, useState } from "react";
import { Stack, Title, Loader, Text } from "@mantine/core";
import { useLeads } from "@/hooks/useLeads";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadFilters, type LeadFiltersValue } from "@/components/leads/LeadFilters";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import type { Lead } from "@/types/lead";

export default function LeadsPage() {
  const { data: leads, isLoading, error } = useLeads();
  const [filters, setFilters] = useState<LeadFiltersValue>({
    stage: null,
    avcbStatus: null,
    category: null,
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const categoryOptions = useMemo(() => {
    if (!leads) return [];
    return Array.from(new Set(leads.map((l) => l.category).filter((c): c is string => !!c))).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter((lead) => {
      if (filters.stage && lead.pipelineStage !== filters.stage) return false;
      if (filters.avcbStatus && lead.avcbStatus !== filters.avcbStatus) return false;
      if (filters.category && lead.category !== filters.category) return false;
      return true;
    });
  }, [leads, filters]);

  return (
    <Stack>
      <Title order={2}>Leads</Title>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar leads.</Text>}

      {leads && (
        <>
          <LeadFilters value={filters} onChange={setFilters} categoryOptions={categoryOptions} />
          <LeadsTable leads={filteredLeads} onRowClick={setSelectedLead} />
        </>
      )}

      <LeadDetailDrawer
        lead={selectedLead ? (filteredLeads.find((l) => l.id === selectedLead.id) ?? selectedLead) : null}
        onClose={() => setSelectedLead(null)}
      />
    </Stack>
  );
}
