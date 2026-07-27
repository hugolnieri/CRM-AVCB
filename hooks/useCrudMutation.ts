import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { getErrorMessage } from "@/lib/errors";

interface Options<TVars, TData> {
  mutationFn: (vars: TVars) => Promise<TData>;
  /** Chaves a invalidar no sucesso. Ex.: [["clientes"], ["treinamentos"]]. */
  invalidate: QueryKey[];
  successMessage?: string | ((data: TData, vars: TVars) => string);
  errorMessage: string;
}

/**
 * Create/update/delete comum: invalida o cache e mostra a notificação, sempre
 * passando o erro por getErrorMessage (o PostgREST devolve objeto simples, que
 * não é `instanceof Error`).
 *
 * Deliberadamente SEM caminho otimista — quem precisa disso é o drag do kanban,
 * e lá o onMutate reordena o cache de um jeito específico que um factory
 * genérico só esconderia. Ver hooks/useUpdateLead.ts.
 */
export function useCrudMutation<TVars, TData = void>({
  mutationFn,
  invalidate,
  successMessage,
  errorMessage,
}: Options<TVars, TData>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, vars) => {
      for (const queryKey of invalidate) {
        queryClient.invalidateQueries({ queryKey });
      }
      if (successMessage) {
        const message =
          typeof successMessage === "function" ? successMessage(data, vars) : successMessage;
        notifications.show({ color: "green", message });
      }
    },
    onError: (err) => {
      notifications.show({ color: "red", message: getErrorMessage(err, errorMessage) });
    },
  });
}
