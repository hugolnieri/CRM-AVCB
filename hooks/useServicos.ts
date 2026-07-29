import { useQuery } from "@tanstack/react-query";
import {
  concluirServico,
  createServico,
  createTipoServico,
  deleteServico,
  deleteTipoServico,
  fetchServicos,
  fetchTiposServico,
  updateServico,
  updateTipoServico,
  type TipoServicoInput,
} from "@/lib/supabase/queries/servicos";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { ServicoInput } from "@/types/servico";

export function useServicos() {
  return useQuery({
    queryKey: ["servicos"],
    queryFn: fetchServicos,
  });
}

export function useTiposServico() {
  return useQuery({
    queryKey: ["tiposServico"],
    queryFn: fetchTiposServico,
  });
}

export function useCreateServico() {
  return useCrudMutation({
    mutationFn: (input: ServicoInput) => createServico(input),
    invalidate: [["servicos"]],
    successMessage: (servico) =>
      servico.status === "agendado" ? "Serviço agendado." : "Serviço registrado.",
    errorMessage: "Erro ao salvar o serviço.",
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

export function useConcluirServico() {
  return useCrudMutation({
    mutationFn: ({
      id,
      dataRealizacao,
      dataVencimento,
    }: {
      id: string;
      dataRealizacao: string;
      dataVencimento: string | null;
    }) => concluirServico(id, dataRealizacao, dataVencimento),
    invalidate: [["servicos"]],
    successMessage: "Serviço concluído.",
    errorMessage: "Erro ao concluir o serviço.",
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

export function useCreateTipoServico() {
  return useCrudMutation({
    mutationFn: (input: TipoServicoInput) => createTipoServico(input),
    invalidate: [["tiposServico"]],
    successMessage: "Tipo criado.",
    errorMessage: "Erro ao criar o tipo. Apenas administradores podem fazer isso.",
  });
}

export function useUpdateTipoServico() {
  return useCrudMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TipoServicoInput> }) =>
      updateTipoServico(id, patch),
    invalidate: [["tiposServico"]],
    successMessage: "Tipo atualizado.",
    errorMessage: "Erro ao salvar o tipo. Apenas administradores podem fazer isso.",
  });
}

export function useDeleteTipoServico() {
  return useCrudMutation({
    mutationFn: (id: string) => deleteTipoServico(id),
    invalidate: [["tiposServico"]],
    successMessage: "Tipo excluído do catálogo.",
    errorMessage: "Erro ao excluir o tipo. Apenas administradores podem fazer isso.",
  });
}
