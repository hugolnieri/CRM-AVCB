import type { TeamMember } from "@/types/team";

export interface OpcaoMembro {
  value: string;
  label: string;
}

/**
 * Opções de "responsável" para os `Select` do app.
 *
 * Quem foi desativado sai da lista — é o ponto de desativar alguém: parar de
 * receber trabalho novo. Mas o registro que **já** aponta para essa pessoa
 * continua oferecendo a opção, marcada como inativa, pela mesma razão de
 * `ServicoForm` manter o tipo desativado do serviço em edição: se a opção
 * sumisse, abrir o cadastro mostraria o campo vazio e salvar qualquer outra
 * coisa apagaria calado a quem o trabalho pertencia.
 *
 * Filtro de relatório é outra coisa e não usa isto: lá se quer justamente poder
 * consultar o histórico de quem saiu.
 */
export function opcoesDeMembro(
  membros: TeamMember[],
  selecionadoId?: string | null,
): OpcaoMembro[] {
  return membros
    .filter((m) => m.ativo || m.id === selecionadoId)
    .map((m) => ({
      value: m.id,
      label: m.ativo ? m.fullName : `${m.fullName} (inativo)`,
    }));
}
