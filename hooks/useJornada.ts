import { useQuery } from "@tanstack/react-query";
import {
  fetchConfiguracoes,
  fetchNotificacoes,
  fetchRegistrosDiarios,
  finalizarDia,
  iniciarDia,
  registrarNotificacao,
  updateConfiguracoes,
} from "@/lib/supabase/queries/jornada";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import type { ConfiguracoesInput } from "@/types/jornada";

export function useRegistrosDiarios() {
  return useQuery({
    queryKey: ["registrosDiarios"],
    queryFn: fetchRegistrosDiarios,
  });
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: ["configuracoes"],
    queryFn: fetchConfiguracoes,
  });
}

export function useNotificacoes() {
  return useQuery({
    queryKey: ["notificacoes"],
    queryFn: fetchNotificacoes,
  });
}

/** Registro de hoje do usuário logado, ou undefined se ainda não abriu o dia. */
export function useRegistroDeHoje() {
  const { data: member } = useCurrentMember();
  const { data: registros, isLoading } = useRegistrosDiarios();
  const hoje = new Date();
  const chave = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  return {
    registro: registros?.find((r) => r.memberId === member?.id && r.data === chave),
    isLoading,
  };
}

export function useIniciarDia() {
  const { data: member } = useCurrentMember();

  return useCrudMutation({
    mutationFn: async () => {
      const registro = await iniciarDia();
      await registrarNotificacao(
        "inicio_dia",
        `${member?.fullName ?? "Colaborador"} iniciou a jornada`,
        `Início registrado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`,
      );
      return registro;
    },
    invalidate: [["registrosDiarios"], ["notificacoes"]],
    successMessage: "Jornada iniciada. Bom trabalho!",
    errorMessage: "Erro ao iniciar a jornada.",
  });
}

export function useFinalizarDia() {
  const { data: member } = useCurrentMember();

  return useCrudMutation({
    mutationFn: async (observacoes: string | null) => {
      const registro = await finalizarDia(observacoes);
      await registrarNotificacao(
        "fim_dia",
        `${member?.fullName ?? "Colaborador"} finalizou a jornada`,
        observacoes ?? "Sem observações.",
      );
      return registro;
    },
    invalidate: [["registrosDiarios"], ["notificacoes"]],
    successMessage: "Dia finalizado.",
    errorMessage: "Erro ao finalizar o dia.",
  });
}

export function useUpdateConfiguracoes() {
  return useCrudMutation({
    mutationFn: (patch: Partial<ConfiguracoesInput>) => updateConfiguracoes(patch),
    invalidate: [["configuracoes"]],
    successMessage: "Configurações salvas.",
    errorMessage: "Erro ao salvar. Apenas administradores podem alterar isto.",
  });
}
