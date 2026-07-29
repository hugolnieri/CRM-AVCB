import { useQuery } from "@tanstack/react-query";
import {
  aprovarExclusao,
  fetchSolicitacoes,
  recusarExclusao,
  solicitarExclusao,
} from "@/lib/supabase/queries/exclusoes";
import { deleteCliente } from "@/lib/supabase/queries/clientes";
import { deleteLead } from "@/lib/supabase/queries/leads";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { EntidadeExcluivel, SolicitacaoExclusao } from "@/types/exclusao";

/** Invalida tudo que uma exclusão aprovada mexe. */
const APOS_EXCLUSAO = [
  ["solicitacoesExclusao"],
  ["leads"],
  ["clientes"],
  ["servicos"],
  ["auditLog"],
];

export function useSolicitacoesExclusao() {
  return useQuery({
    queryKey: ["solicitacoesExclusao"],
    queryFn: fetchSolicitacoes,
    // Alimenta o sino, que vive no shell e portanto em toda página.
    staleTime: 30_000,
  });
}

export function useSolicitarExclusao() {
  return useCrudMutation({
    mutationFn: (input: {
      entidade: EntidadeExcluivel;
      registroId: string;
      rotulo: string;
      motivo: string | null;
    }) => solicitarExclusao(input),
    invalidate: [["solicitacoesExclusao"]],
    successMessage: "Pedido enviado. Um administrador vai decidir.",
    errorMessage: "Erro ao solicitar a exclusão.",
  });
}

export function useAprovarExclusao() {
  return useCrudMutation({
    mutationFn: (solicitacao: SolicitacaoExclusao) => aprovarExclusao(solicitacao),
    invalidate: APOS_EXCLUSAO,
    successMessage: "Registro excluído.",
    errorMessage: "Erro ao excluir. Apenas administradores podem aprovar.",
  });
}

export function useRecusarExclusao() {
  return useCrudMutation({
    mutationFn: ({ id, observacao }: { id: string; observacao: string | null }) =>
      recusarExclusao(id, observacao),
    invalidate: [["solicitacoesExclusao"]],
    successMessage: "Pedido recusado.",
    errorMessage: "Erro ao recusar o pedido.",
  });
}

/**
 * Exclusão direta, sem passar por pedido — o admin não solicita a si mesmo.
 *
 * Não reaproveita `aprovarExclusao` porque lá o segundo passo é marcar a
 * solicitação como decidida, e aqui não existe solicitação para marcar.
 */
export function useExcluirDireto() {
  return useCrudMutation({
    mutationFn: ({ entidade, id }: { entidade: EntidadeExcluivel; id: string }) =>
      entidade === "lead" ? deleteLead(id) : deleteCliente(id),
    invalidate: APOS_EXCLUSAO,
    successMessage: "Registro excluído.",
    errorMessage: "Erro ao excluir. Apenas administradores podem excluir.",
  });
}
