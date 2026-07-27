import { useQuery } from "@tanstack/react-query";
import {
  createTipoTreinamento,
  createTreinamento,
  deleteTreinamento,
  fetchTiposTreinamento,
  fetchTreinamentos,
  updateTipoTreinamento,
  updateTreinamento,
  type TipoTreinamentoInput,
} from "@/lib/supabase/queries/treinamentos";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { TreinamentoInput } from "@/types/treinamento";

export function useTreinamentos() {
  return useQuery({
    queryKey: ["treinamentos"],
    queryFn: fetchTreinamentos,
  });
}

export function useTiposTreinamento() {
  return useQuery({
    queryKey: ["tiposTreinamento"],
    queryFn: fetchTiposTreinamento,
  });
}

export function useCreateTreinamento() {
  return useCrudMutation({
    mutationFn: (input: TreinamentoInput) => createTreinamento(input),
    invalidate: [["treinamentos"]],
    successMessage: "Treinamento registrado.",
    errorMessage: "Erro ao registrar o treinamento.",
  });
}

export function useUpdateTreinamento() {
  return useCrudMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TreinamentoInput> }) =>
      updateTreinamento(id, patch),
    invalidate: [["treinamentos"]],
    successMessage: "Treinamento atualizado.",
    errorMessage: "Erro ao salvar o treinamento.",
  });
}

export function useDeleteTreinamento() {
  return useCrudMutation({
    mutationFn: (id: string) => deleteTreinamento(id),
    invalidate: [["treinamentos"]],
    successMessage: "Treinamento excluído.",
    errorMessage: "Erro ao excluir o treinamento.",
  });
}

export function useCreateTipoTreinamento() {
  return useCrudMutation({
    mutationFn: (input: TipoTreinamentoInput) => createTipoTreinamento(input),
    invalidate: [["tiposTreinamento"]],
    successMessage: "Tipo de treinamento criado.",
    errorMessage: "Erro ao criar o tipo. Apenas administradores podem fazer isso.",
  });
}

export function useUpdateTipoTreinamento() {
  return useCrudMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TipoTreinamentoInput> }) =>
      updateTipoTreinamento(id, patch),
    invalidate: [["tiposTreinamento"]],
    successMessage: "Tipo de treinamento atualizado.",
    errorMessage: "Erro ao salvar o tipo. Apenas administradores podem fazer isso.",
  });
}
