import { useQuery } from "@tanstack/react-query";
import { fetchLeads } from "@/lib/supabase/queries/leads";

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
  });
}
