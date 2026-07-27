import { useQuery } from "@tanstack/react-query";
import {
  createServico,
  deleteServico,
  fetchServicos,
  updateServico,
} from "@/lib/supabase/queries/servicos";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { ServicoInput } from "@/types/servico";

export function useServicos() {
  return useQuery({
    queryKey: ["servicos"],
    queryFn: fetchServicos,
  });
}

export function useCreateServico() {
  return useCrudMutation({
    mutationFn: (input: ServicoInput) => createServico(input),
    invalidate: [["servicos"]],
    successMessage: "Serviço registrado.",
    errorMessage: "Erro ao registrar o serviço.",
  });
}

export function useUpdateServico() {
  return useCrudMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ServicoInput> }) =>
      updateServico(id, patch),
    invalidate: [["servicos"]],
    successMessage: "Serviço atualizado.",
    errorMessage: "Erro ao salvar o serviço.",
  });
}

export function useDeleteServico() {
  return useCrudMutation({
    mutationFn: (id: string) => deleteServico(id),
    invalidate: [["servicos"]],
    successMessage: "Serviço excluído.",
    errorMessage: "Erro ao excluir o serviço.",
  });
}
