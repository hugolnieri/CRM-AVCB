import { useMemo } from "react";
import { useLeads } from "@/hooks/useLeads";
import { useClientes } from "@/hooks/useClientes";
import { useServicos, useTiposServico } from "@/hooks/useServicos";
import { useTarefas } from "@/hooks/useTarefas";
import { useSolicitacoesExclusao } from "@/hooks/useExclusoes";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { computePainel } from "@/lib/painel";
import { avisosPara, type Aviso } from "@/lib/avisos";

/**
 * Os avisos de quem está logado.
 *
 * O sino vive no shell, então este hook roda em toda página — e é o preço
 * assumido de um sino global. As listas são pequenas nesta escala, o TanStack
 * Query deduplica entre componentes, e `useTarefas`/`useSolicitacoesExclusao`
 * nascem com `staleTime` justamente por causa disto. As demais já eram
 * carregadas pelo Painel, pela Agenda e pelas listas.
 */
export function useAvisos(): Aviso[] {
  const { data: member } = useCurrentMember();
  const { data: leads } = useLeads();
  const { data: clientes } = useClientes();
  const { data: servicos } = useServicos();
  const { data: tipos } = useTiposServico();
  const { data: tarefas } = useTarefas();
  const { data: solicitacoes } = useSolicitacoesExclusao();

  return useMemo(() => {
    if (!member) return [];

    // Mesma fonte de pendências do Painel e de /tarefas: um lugar só define o
    // que conta como pendência.
    const { pendencias } = computePainel({
      clientes: clientes ?? [],
      servicos: servicos ?? [],
      tipos: tipos ?? [],
      leads: leads ?? [],
      solicitacoes: solicitacoes ?? [],
    });

    return avisosPara(
      {
        tarefas: tarefas ?? [],
        pendencias,
        solicitacoes: solicitacoes ?? [],
        leads: leads ?? [],
        servicos: servicos ?? [],
      },
      { memberId: member.id, isAdmin: member.role === "admin" },
    );
  }, [member, leads, clientes, servicos, tipos, tarefas, solicitacoes]);
}
