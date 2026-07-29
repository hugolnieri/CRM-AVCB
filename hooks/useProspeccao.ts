import { useQuery } from "@tanstack/react-query";
import {
  contarProspeccao,
  descartar,
  fetchCidadesProspeccao,
  fetchCompetencia,
  fetchProspeccao,
  type FiltroProspeccao,
} from "@/lib/supabase/queries/prospeccao";
import { useCrudMutation } from "@/hooks/useCrudMutation";

/**
 * A base de prospecção muda uma vez por mês, quando o robô roda. Não há razão
 * para revalidar de minuto em minuto como as tabelas que a equipe edita.
 */
const CINCO_MINUTOS = 5 * 60_000;

export function useProspeccao(filtro: FiltroProspeccao, habilitado = true) {
  return useQuery({
    queryKey: ["prospeccao", filtro],
    queryFn: () => fetchProspeccao(filtro),
    staleTime: CINCO_MINUTOS,
    enabled: habilitado,
  });
}

export function useCidadesProspeccao(habilitado = true) {
  return useQuery({
    queryKey: ["prospeccaoCidades"],
    queryFn: fetchCidadesProspeccao,
    staleTime: CINCO_MINUTOS,
    enabled: habilitado,
  });
}

export function useCompetenciaProspeccao(habilitado = true) {
  return useQuery({
    queryKey: ["prospeccaoCompetencia"],
    queryFn: fetchCompetencia,
    staleTime: CINCO_MINUTOS,
    enabled: habilitado,
  });
}

/** Alimenta o selo no botão "Importar" — por isso é contagem, e não a lista. */
export function useTotalProspeccao() {
  return useQuery({
    queryKey: ["prospeccaoTotal"],
    queryFn: contarProspeccao,
    staleTime: CINCO_MINUTOS,
  });
}

export function useDescartarProspeccao() {
  return useCrudMutation({
    mutationFn: ({ ids, memberId }: { ids: string[]; memberId: string | null }) =>
      descartar(ids, memberId),
    invalidate: [["prospeccao"], ["prospeccaoTotal"], ["prospeccaoCidades"]],
    successMessage: "Empresas descartadas. Não voltam na coleta do mês que vem.",
    errorMessage: "Erro ao descartar.",
  });
}
