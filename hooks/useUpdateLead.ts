import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateLeadAvcb, updateLeadStage } from "@/lib/supabase/queries/leads";
import { addActivity } from "@/lib/supabase/queries/activities";
import type { AvcbStatus, Lead, PipelineStage } from "@/types/lead";

export function useUpdateLeadStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      fromStage,
      toStage,
    }: {
      leadId: string;
      fromStage: PipelineStage;
      toStage: PipelineStage;
    }) => {
      await updateLeadStage(leadId, toStage);
      await addActivity(leadId, "stage_change", null, {
        from_stage: fromStage,
        to_stage: toStage,
      });
    },
    // Optimistic update: move the card in the local cache immediately so the UI
    // reacts instantly, instead of waiting for the DB writes + refetch (several
    // round trips on the free Supabase tier). Roll back if the write fails.
    onMutate: async ({ leadId, toStage }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      const previous = queryClient.getQueryData<Lead[]>(["leads"]);
      queryClient.setQueryData<Lead[]>(["leads"], (old) =>
        old?.map((l) => (l.id === leadId ? { ...l, pipelineStage: toStage } : l)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["leads"], context.previous);
    },
    onSettled: (_data, _err, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["activities", leadId] });
    },
  });
}

export function useUpdateLeadAvcb() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      avcbStatus,
      avcbValidade,
    }: {
      leadId: string;
      avcbStatus: AvcbStatus;
      avcbValidade: string | null;
    }) => updateLeadAvcb(leadId, avcbStatus, avcbValidade),
    onSuccess: (_data, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["activities", leadId] });
    },
  });
}
