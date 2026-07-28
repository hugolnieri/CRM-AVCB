import dayjs, { type Dayjs } from "dayjs";
import { nomeCliente, type Cliente } from "@/types/cliente";
import type { Lead } from "@/types/lead";
import type { Servico, TipoServico } from "@/types/servico";
import { agruparPorBucket, itensVenciveis, type ItemVencivel } from "@/lib/vencimentos";

export type PendenciaTipo =
  | "vencido"
  | "cliente_sem_servico"
  | "vencimento_ausente"
  | "conversao_pendente"
  | "agendado_atrasado";

export interface Pendencia {
  id: string;
  tipo: PendenciaTipo;
  descricao: string;
  /** Para onde a interface deve navegar ao clicar. */
  href: string;
}

export interface PainelResumo {
  clientesAtivos: number;
  servicosRealizados: number;
  servicosAgendados: number;
  /** Itens que vencem nos próximos 30 dias (não inclui os já vencidos). */
  proximosVencimentos: number;
  vencidos: number;
  pendencias: Pendencia[];
}

interface Entrada {
  clientes: Cliente[];
  servicos: Servico[];
  tipos: TipoServico[];
  leads: Lead[];
}

/**
 * O painel administrativo pedido nos requisitos: clientes cadastrados, serviços
 * realizados, próximos vencimentos e pendências.
 *
 * "Pendência" é vago no documento, então aqui ela é definida concretamente como
 * as cinco coisas que exigem alguém agir — e cada uma leva a uma tela.
 */
export function computePainel(
  { clientes, servicos, tipos, leads }: Entrada,
  now: Dayjs = dayjs(),
): PainelResumo {
  const ativos = clientes.filter((c) => c.status === "ativo");
  const itens = itensVenciveis(servicos, clientes);
  const grupos = agruparPorBucket(itens, now);
  const realizados = servicos.filter((s) => s.status === "realizado");
  const agendados = servicos.filter((s) => s.status === "agendado");

  return {
    clientesAtivos: ativos.length,
    servicosRealizados: realizados.length,
    servicosAgendados: agendados.length,
    proximosVencimentos: grupos.esta_semana.length + grupos.este_mes.length,
    vencidos: grupos.vencido.length,
    pendencias: [
      ...pendenciasVencidas(grupos.vencido),
      ...pendenciasAgendadoAtrasado(agendados, clientes, now),
      ...pendenciasConversao(leads, clientes),
      ...pendenciasClienteSemServico(ativos, realizados),
      ...pendenciasVencimentoAusente(realizados, tipos),
    ],
  };
}

function pendenciasVencidas(vencidos: ItemVencivel[]): Pendencia[] {
  return vencidos.map((item) => ({
    id: `vencido-${item.id}`,
    tipo: "vencido",
    descricao: `${item.clienteNome}: ${item.descricao} venceu em ${dayjs(item.dataVencimento).format("DD/MM/YYYY")}`,
    href: `/clientes/${item.clienteId}`,
  }));
}

/**
 * Compromisso cuja data já passou e ninguém marcou como realizado. Sem isto o
 * agendamento vira um buraco silencioso: o serviço some da agenda e nunca gera
 * vencimento.
 */
function pendenciasAgendadoAtrasado(
  agendados: Servico[],
  clientes: Cliente[],
  now: Dayjs,
): Pendencia[] {
  const nomePorId = new Map(clientes.map((c) => [c.id, nomeCliente(c)]));
  return agendados
    .filter((s) => s.dataAgendada && dayjs(s.dataAgendada).isBefore(now, "day"))
    .map((s) => ({
      id: `agendado-${s.id}`,
      tipo: "agendado_atrasado" as const,
      descricao: `${nomePorId.get(s.clienteId) ?? "Cliente"}: ${s.tipoNome} estava agendado para ${dayjs(s.dataAgendada).format("DD/MM/YYYY")} e não foi concluído`,
      href: `/clientes/${s.clienteId}`,
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

function pendenciasClienteSemServico(ativos: Cliente[], realizados: Servico[]): Pendencia[] {
  const comServico = new Set(realizados.map((s) => s.clienteId));
  return ativos
    .filter((c) => !comServico.has(c.id))
    .map((cliente) => ({
      id: `sem-servico-${cliente.id}`,
      tipo: "cliente_sem_servico" as const,
      descricao: `${nomeCliente(cliente)} não tem nenhum serviço registrado`,
      href: `/clientes/${cliente.id}`,
    }));
}

/**
 * Serviço realizado sem vencimento cujo tipo TEM validade definida: dado
 * incompleto, quase sempre alguém que limpou o campo sugerido sem querer.
 * Serviço de tipo sem validade não é pendência — esse realmente não vence.
 */
function pendenciasVencimentoAusente(realizados: Servico[], tipos: TipoServico[]): Pendencia[] {
  const validadePorTipo = new Map(tipos.map((t) => [t.id, t.validadeMeses]));
  return realizados
    .filter(
      (s) =>
        s.dataVencimento === null &&
        s.tipoServicoId !== null &&
        (validadePorTipo.get(s.tipoServicoId) ?? null) !== null,
    )
    .map((s) => ({
      id: `sem-vencimento-${s.id}`,
      tipo: "vencimento_ausente" as const,
      descricao: `"${s.tipoNome}" de ${dayjs(s.dataRealizacao).format("DD/MM/YYYY")} está sem data de vencimento`,
      href: `/clientes/${s.clienteId}`,
    }));
}

export const PENDENCIA_LABELS: Record<PendenciaTipo, { label: string; color: string }> = {
  vencido: { label: "Vencido", color: "red" },
  agendado_atrasado: { label: "Agendamento atrasado", color: "orange" },
  conversao_pendente: { label: "Conversão pendente", color: "blue" },
  cliente_sem_servico: { label: "Sem serviço", color: "yellow" },
  vencimento_ausente: { label: "Dado incompleto", color: "gray" },
};
