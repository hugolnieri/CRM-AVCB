import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  addActivity,
  fetchActivities,
  fetchActivitiesRecentes,
} from "@/lib/supabase/queries/activities";
import { ownerKey, type ActivityOwner, type ActivityType } from "@/types/activity";

/** Atividades dos últimos N dias, para o relatório diário do admin. */
export function useActivitiesRecentes(dias = 30) {
  const desde = dayjs().subtract(dias, "day").startOf("day").toISOString();
  return useQuery({
    queryKey: ["activitiesRecentes", dias],
    queryFn: () => fetchActivitiesRecentes(desde),
  });
}

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
