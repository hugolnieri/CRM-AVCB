import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moveLead, updateLead } from "@/lib/supabase/queries/leads";
import { addActivity } from "@/lib/supabase/queries/activities";
import { activitiesQueryKey } from "@/hooks/useActivities";
import type { Lead, PipelineStage } from "@/types/lead";

/** Server order: highest position first, then newest — mirror it in the cache. */
function sortLeads(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    if (b.position !== a.position) return b.position - a.position;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * A única mutação com caminho otimista escrito à mão, de propósito: o card
 * precisa pular para o topo da coluna no instante do drop. As demais usam
 * useCrudMutation, que é genérico e não sabe reordenar o cache.
 */
export function useUpdateLeadStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      fromStage,
      toStage,
      position,
    }: {
      leadId: string;
      fromStage: PipelineStage;
      toStage: PipelineStage;
      position: number;
    }) => {
      await moveLead(leadId, toStage, position);
      // Only log an activity when the stage actually changed — dragging a card
      // to reorder it within the same column shouldn't clutter the history.
      if (fromStage !== toStage) {
        await addActivity({ leadId }, "stage_change", null, {
          from_stage: fromStage,
          to_stage: toStage,
        });
      }
    },
    // Optimistic update: apply the new stage + position and re-sort so the card
    // jumps to the top of its column instantly, without waiting for the DB
    // writes + refetch. Roll back if the write fails.
    onMutate: async ({ leadId, toStage, position }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previous = queryClient.getQueryData<Lead[]>(["leads"]);
      queryClient.setQueryData<Lead[]>(["leads"], (old) =>
        old
          ? sortLeads(
              old.map((l) =>
                l.id === leadId ? { ...l, pipelineStage: toStage, position } : l,
              ),
            )
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["leads"], context.previous);
    },
    onSettled: (_data, _err, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: activitiesQueryKey({ leadId }) });
    },
  });
}

export function useUpdateLeadFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      followUpAt,
      followUpNote,
    }: {
      leadId: string;
      followUpAt: string | null;
      followUpNote: string | null;
    }) => {
      await updateLead(leadId, { followUpAt, followUpNote });
      // Registra no histórico do lead: agendamento ou conclusão do retorno.
      if (followUpAt) {
        await addActivity({ leadId }, "follow_up", followUpNote, { follow_up_at: followUpAt });
      } else {
        await addActivity({ leadId }, "follow_up", "Retorno concluído/removido", { cleared: true });
      }
    },
    onSuccess: (_data, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: activitiesQueryKey({ leadId }) });
    },
  });
}
