import dayjs, { type Dayjs } from "dayjs";
import { nomeCliente, type Cliente } from "@/types/cliente";
import type { Lead } from "@/types/lead";
import type { Servico } from "@/types/servico";
import type { TipoTreinamento, Treinamento } from "@/types/treinamento";
import { agruparPorBucket, itensVenciveis, type ItemVencivel } from "@/lib/vencimentos";

export type PendenciaTipo =
  | "vencido"
  | "cliente_sem_treinamento"
  | "vencimento_ausente"
  | "conversao_pendente";

export interface Pendencia {
  id: string;
  tipo: PendenciaTipo;
  descricao: string;
  /** Para onde a interface deve navegar ao clicar. */
  href: string;
}

export interface PainelResumo {
  clientesAtivos: number;
  treinamentosRealizados: number;
  servicosRealizados: number;
  /** Itens que vencem nos próximos 30 dias (não inclui os já vencidos). */
  proximosVencimentos: number;
  vencidos: number;
  pendencias: Pendencia[];
}

interface Entrada {
  clientes: Cliente[];
  treinamentos: Treinamento[];
  servicos: Servico[];
  tipos: TipoTreinamento[];
  leads: Lead[];
}

/**
 * O painel administrativo pedido nos requisitos: clientes cadastrados,
 * treinamentos e serviços realizados, próximos vencimentos e pendências.
 *
 * "Pendência" é vago no documento, então aqui ela é definida concretamente como
 * as quatro coisas que exigem alguém agir — e cada uma leva a uma tela.
 */
export function computePainel(
  { clientes, treinamentos, servicos, tipos, leads }: Entrada,
  now: Dayjs = dayjs(),
): PainelResumo {
  const ativos = clientes.filter((c) => c.status === "ativo");
  const itens = itensVenciveis(treinamentos, servicos, clientes);
  const grupos = agruparPorBucket(itens, now);

  return {
    clientesAtivos: ativos.length,
    treinamentosRealizados: treinamentos.length,
    servicosRealizados: servicos.length,
    proximosVencimentos: grupos.esta_semana.length + grupos.este_mes.length,
    vencidos: grupos.vencido.length,
    pendencias: [
      ...pendenciasVencidas(grupos.vencido),
      ...pendenciasConversao(leads, clientes),
      ...pendenciasClienteSemTreinamento(ativos, treinamentos),
      ...pendenciasVencimentoAusente(treinamentos, tipos),
    ],
  };
}

function pendenciasVencidas(vencidos: ItemVencivel[]): Pendencia[] {
  return vencidos.map((item) => ({
    id: `vencido-${item.origem}-${item.id}`,
    tipo: "vencido",
    descricao: `${item.clienteNome}: ${item.descricao} venceu em ${dayjs(item.dataVencimento).format("DD/MM/YYYY")}`,
    href: `/clientes/${item.clienteId}`,
  }));
}

/**
 * Lead ganho que nunca virou cliente. É a pendência que justifica manter o funil
 * e o cadastro no mesmo sistema: sem ela, um negócio fechado some do radar entre
 * as duas metades do CRM.
 */
function pendenciasConversao(leads: Lead[], clientes: Cliente[]): Pendencia[] {
  const convertidos = new Set(clientes.map((c) => c.leadId).filter(Boolean));
  return leads
    .filter((l) => l.pipelineStage === "fechado_ganho" && !convertidos.has(l.id))
    .map((lead) => ({
      id: `conversao-${lead.id}`,
      tipo: "conversao_pendente" as const,
      descricao: `Lead ganho "${lead.name}" ainda não foi convertido em cliente`,
      href: "/leads",
    }));
}

function pendenciasClienteSemTreinamento(
  ativos: Cliente[],
  treinamentos: Treinamento[],
): Pendencia[] {
  const comTreinamento = new Set(treinamentos.map((t) => t.clienteId));
  return ativos
    .filter((c) => !comTreinamento.has(c.id))
    .map((cliente) => ({
      id: `sem-treinamento-${cliente.id}`,
      tipo: "cliente_sem_treinamento" as const,
      descricao: `${nomeCliente(cliente)} não tem nenhum treinamento registrado`,
      href: `/clientes/${cliente.id}`,
    }));
}

/**
 * Treinamento sem vencimento cujo tipo TEM validade definida: dado incompleto,
 * quase sempre alguém que limpou o campo sugerido sem querer. Treinamento de tipo
 * sem validade não é pendência — esse realmente não vence.
 */
function pendenciasVencimentoAusente(
  treinamentos: Treinamento[],
  tipos: TipoTreinamento[],
): Pendencia[] {
  const validadePorTipo = new Map(tipos.map((t) => [t.id, t.validadeMeses]));
  return treinamentos
    .filter(
      (t) =>
        t.dataVencimento === null &&
        t.tipoTreinamentoId !== null &&
        (validadePorTipo.get(t.tipoTreinamentoId) ?? null) !== null,
    )
    .map((t) => ({
      id: `sem-vencimento-${t.id}`,
      tipo: "vencimento_ausente" as const,
      descricao: `Treinamento "${t.tipoNome}" de ${dayjs(t.dataRealizacao).format("DD/MM/YYYY")} está sem data de vencimento`,
      href: `/clientes/${t.clienteId}`,
    }));
}

export const PENDENCIA_LABELS: Record<PendenciaTipo, { label: string; color: string }> = {
  vencido: { label: "Vencido", color: "red" },
  conversao_pendente: { label: "Conversão pendente", color: "blue" },
  cliente_sem_treinamento: { label: "Sem treinamento", color: "orange" },
  vencimento_ausente: { label: "Dado incompleto", color: "yellow" },
};
