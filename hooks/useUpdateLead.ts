import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateLeadAvcb, updateLeadStage } from "@/lib/supabase/queries/leads";
import { addActivity } from "@/lib/supabase/queries/activities";
import type { AvcbStatus, PipelineStage } from "@/types/lead";

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
    onSuccess: (_data, { leadId }) => {
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
