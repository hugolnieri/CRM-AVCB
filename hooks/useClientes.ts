import { useQuery } from "@tanstack/react-query";
import {
  createCliente,
  fetchClientes,
  inativarCliente,
  updateCliente,
} from "@/lib/supabase/queries/clientes";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { ClienteInput } from "@/types/cliente";

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientes,
  });
}

export function useCreateCliente() {
  return useCrudMutation({
    mutationFn: (input: Partial<ClienteInput> & { razaoSocial: string }) => createCliente(input),
    invalidate: [["clientes"], ["leads"]],
    successMessage: (cliente) => `Cliente "${cliente.razaoSocial}" cadastrado.`,
    errorMessage: "Erro ao cadastrar o cliente.",
  });
}

export function useUpdateCliente() {
  return useCrudMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ClienteInput> }) =>
      updateCliente(id, patch),
    invalidate: [["clientes"]],
    successMessage: "Cliente atualizado.",
    errorMessage: "Erro ao salvar o cliente.",
  });
}

export function useToggleClienteAtivo() {
  return useCrudMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => inativarCliente(id, ativo),
    invalidate: [["clientes"]],
    successMessage: (_data, { ativo }) => (ativo ? "Cliente reativado." : "Cliente inativado."),
    errorMessage: "Erro ao alterar a situação do cliente.",
  });
}
