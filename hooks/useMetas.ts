import { useQuery } from "@tanstack/react-query";
import {
  createMeta,
  deleteMeta,
  fetchMetas,
  updateMeta,
} from "@/lib/supabase/queries/metas";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { MetaInput } from "@/types/meta";

export function useMetas() {
  return useQuery({
    queryKey: ["metas"],
    queryFn: fetchMetas,
  });
}

export function useCreateMeta() {
  return useCrudMutation({
    mutationFn: (input: MetaInput) => createMeta(input),
    invalidate: [["metas"]],
    successMessage: "Meta criada.",
    errorMessage: "Erro ao criar a meta. Apenas administradores podem fazer isso.",
  });
}

export function useUpdateMeta() {
  return useCrudMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<MetaInput> }) => updateMeta(id, patch),
    invalidate: [["metas"]],
    successMessage: "Meta atualizada.",
    errorMessage: "Erro ao salvar a meta. Apenas administradores podem fazer isso.",
  });
}

export function useDeleteMeta() {
  return useCrudMutation({
    mutationFn: (id: string) => deleteMeta(id),
    invalidate: [["metas"]],
    successMessage: "Meta excluída.",
    errorMessage: "Erro ao excluir a meta.",
  });
}
