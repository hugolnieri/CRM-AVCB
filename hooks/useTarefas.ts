import { useQuery } from "@tanstack/react-query";
import {
  concluirTarefa,
  createTarefa,
  deleteTarefa,
  fetchTarefas,
  updateTarefa,
} from "@/lib/supabase/queries/tarefas";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { TarefaInput } from "@/types/tarefa";

export function useTarefas() {
  return useQuery({
    queryKey: ["tarefas"],
    queryFn: fetchTarefas,
    // Alimenta o sino, que vive no shell e portanto em toda página.
    staleTime: 30_000,
  });
}

export function useCreateTarefa() {
  return useCrudMutation({
    mutationFn: (input: Partial<TarefaInput> & { titulo: string }) => createTarefa(input),
    invalidate: [["tarefas"]],
    successMessage: "Tarefa criada.",
    errorMessage: "Erro ao criar a tarefa.",
  });
}

export function useUpdateTarefa() {
  return useCrudMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TarefaInput> }) =>
      updateTarefa(id, patch),
    invalidate: [["tarefas"]],
    successMessage: "Tarefa atualizada.",
    errorMessage: "Erro ao salvar. Só o responsável ou um administrador pode editar.",
  });
}

export function useConcluirTarefa() {
  return useCrudMutation({
    mutationFn: ({ id, concluida }: { id: string; concluida: boolean }) =>
      concluirTarefa(id, concluida),
    invalidate: [["tarefas"]],
    successMessage: "Tarefa atualizada.",
    errorMessage: "Erro ao concluir. Só o responsável ou um administrador pode.",
  });
}

export function useDeleteTarefa() {
  return useCrudMutation({
    mutationFn: (id: string) => deleteTarefa(id),
    invalidate: [["tarefas"]],
    successMessage: "Tarefa excluída.",
    errorMessage: "Erro ao excluir a tarefa.",
  });
}
