import { useQuery } from "@tanstack/react-query";
import { createLead, fetchLeads, updateLead } from "@/lib/supabase/queries/leads";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { LeadInput } from "@/types/lead";

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
  });
}

export function useCreateLead() {
  return useCrudMutation({
    mutationFn: (input: Partial<LeadInput> & { name: string }) => createLead(input),
    invalidate: [["leads"]],
    successMessage: (lead) => `Lead "${lead.name}" criado.`,
    errorMessage: "Erro ao criar o lead.",
  });
}

export function useUpdateLeadInfo() {
  return useCrudMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<LeadInput> }) => updateLead(id, patch),
    invalidate: [["leads"]],
    successMessage: "Dados do lead atualizados.",
    errorMessage: "Erro ao salvar o lead.",
  });
}

// A exclusão de lead vive em hooks/useExclusoes.ts, junto com a de cliente:
// as duas passam pelo mesmo fluxo de solicitação/aprovação, e separá-las aqui
// deixaria dois caminhos para a mesma regra.
