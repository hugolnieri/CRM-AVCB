import { useQuery } from "@tanstack/react-query";
import { fetchCurrentMember, fetchTeamMembers } from "@/lib/supabase/queries/team";

/**
 * Perfil (e portanto o papel) do usuário logado.
 *
 * staleTime curto de propósito: se um admin rebaixar alguém, a interface daquela
 * pessoa deve parar de oferecer as ações de admin rápido. Vale lembrar que isso
 * é só cosmético — a RLS já barra a ação no mesmo instante, independentemente do
 * que a tela mostre.
 */
export function useCurrentMember() {
  return useQuery({
    queryKey: ["currentMember"],
    queryFn: fetchCurrentMember,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["teamMembers"],
    queryFn: fetchTeamMembers,
  });
}
