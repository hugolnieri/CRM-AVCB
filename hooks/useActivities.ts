import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addActivity, fetchActivities } from "@/lib/supabase/queries/activities";
import { ownerKey, type ActivityOwner, type ActivityType } from "@/types/activity";

/** ["activities", "lead", id] ou ["activities", "cliente", id]. */
export function activitiesQueryKey(owner: ActivityOwner) {
  return ["activities", ...ownerKey(owner)] as const;
}

export function useActivities(owner: ActivityOwner | null) {
  return useQuery({
    queryKey: owner ? activitiesQueryKey(owner) : ["activities", "none"],
    queryFn: () => fetchActivities(owner as ActivityOwner),
    enabled: owner !== null,
  });
}

export function useAddActivity(owner: ActivityOwner | null) {
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
    }) => addActivity(owner as ActivityOwner, activityType, body, metadata),
    onSuccess: () => {
      if (owner) queryClient.invalidateQueries({ queryKey: activitiesQueryKey(owner) });
    },
  });
}
