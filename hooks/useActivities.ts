import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addActivity, fetchActivitiesForLead } from "@/lib/supabase/queries/activities";
import type { ActivityType } from "@/types/activity";

export function useActivities(leadId: string | null) {
  return useQuery({
    queryKey: ["activities", leadId],
    queryFn: () => fetchActivitiesForLead(leadId as string),
    enabled: leadId !== null,
  });
}

export function useAddActivity(leadId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      activityType,
      body,
      metadata,
    }: {
      activityType: ActivityType;
      body: string | null;
      metadata?: Record<string, unknown>;
    }) => addActivity(leadId as string, activityType, body, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", leadId] });
    },
  });
}
