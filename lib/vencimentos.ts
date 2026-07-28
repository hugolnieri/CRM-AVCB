import dayjs, { type Dayjs } from "dayjs";
import { nomeCliente, type Cliente } from "@/types/cliente";
import type { Servico } from "@/types/servico";

export type VencimentoBucket = "vencido" | "esta_semana" | "este_mes" | "futuro";

export type SituacaoCliente = "em_dia" | "a_vencer" | "vencido" | "sem_registros";

/** Um serviço realizado que vence, achatado para exibição. */
export interface ItemVencivel {
  id: string;
  clienteId: string;
  clienteNome: string;
  /** Nome do tipo de serviço. */
  descricao: string;
  /** "YYYY-MM-DD". */
  dataVencimento: string;
}

/**
 * Em que "balde" um vencimento cai, relativo a hoje:
 *  - vencido: a data já passou (dia anterior a hoje)
 *  - esta_semana: hoje ou dentro dos próximos 7 dias
 *  - este_mes: dentro dos próximos 30 dias
 *  - futuro: além disso
 *
 * A checagem de "hoje" vem antes da de "vencido" de propósito, pelo mesmo motivo
 * de followUpBucket em lib/followup.ts: um serviço que vence hoje ainda vale
 * hoje, e não deve piscar como vencido o dia inteiro.
 *
 * As janelas são MÓVEIS (+7 e +30 dias), não de calendário. Usar
 * dayjs().endOf("week") pareceria mais fiel a "vence esta semana", mas
 * `dayjs.locale("pt-br")` nunca é chamado globalmente (o DatesProvider em
 * app/providers.tsx configura só os componentes do Mantine), então endOf("week")
 * usaria o locale `en` em silêncio. Janela móvel é livre de locale,
 * determinística e testável.
 */
export function vencimentoBucket(dataVencimento: string, now: Dayjs = dayjs()): VencimentoBucket {
  const when = dayjs(dataVencimento);
  if (when.isSame(now, "day")) return "esta_semana";
  if (when.isBefore(now, "day")) return "vencido";
  if (when.isBefore(now.add(7, "day"))) return "esta_semana";
  if (when.isBefore(now.add(30, "day"))) return "este_mes";
  return "futuro";
}

export const VENCIMENTO_BUCKETS: { value: VencimentoBucket; label: string; color: string }[] = [
  { value: "vencido", label: "Já venceu", color: "red" },
  { value: "esta_semana", label: "Vence esta semana", color: "orange" },
  { value: "este_mes", label: "Vence este mês", color: "yellow" },
  { value: "futuro", label: "Mais adiante", color: "gray" },
];

/**
 * Serviços que vencem, ordenados do mais urgente ao mais distante.
 *
 * Só entra o que foi `realizado` e tem data de vencimento: um serviço agendado
 * ainda não gerou validade, e um cancelado não conta.
 */
export function itensVenciveis(servicos: Servico[], clientes: Cliente[]): ItemVencivel[] {
  const nomePorId = new Map(clientes.map((c) => [c.id, nomeCliente(c)]));

  return servicos
    .filter((s) => s.status === "realizado" && s.dataVencimento !== null)
    .map((s) => ({
      id: s.id,
      clienteId: s.clienteId,
      clienteNome: nomePorId.get(s.clienteId) ?? "Cliente removido",
      descricao: s.tipoNome,
      dataVencimento: s.dataVencimento as string,
    }))
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
}

export function agruparPorBucket(
  itens: ItemVencivel[],
  now: Dayjs = dayjs(),
): Record<VencimentoBucket, ItemVencivel[]> {
  const grupos: Record<VencimentoBucket, ItemVencivel[]> = {
    vencido: [],
    esta_semana: [],
    este_mes: [],
    futuro: [],
  };
  for (const item of itens) {
    grupos[vencimentoBucket(item.dataVencimento, now)].push(item);
  }
  return grupos;
}

/**
 * Situação de conformidade de um cliente, derivada e nunca armazenada: uma coluna
 * no banco ficaria desatualizada no dia em que um serviço vencesse sem que
 * ninguém abrisse o registro.
 */
export function situacaoCliente(
  clienteId: string,
  itens: ItemVencivel[],
  now: Dayjs = dayjs(),
): SituacaoCliente {
  const doCliente = itens.filter((i) => i.clienteId === clienteId);
  if (doCliente.length === 0) return "sem_registros";

  const buckets = doCliente.map((i) => vencimentoBucket(i.dataVencimento, now));
  if (buckets.includes("vencido")) return "vencido";
  if (buckets.includes("esta_semana") || buckets.includes("este_mes")) return "a_vencer";
  return "em_dia";
}

export const SITUACAO_LABELS: Record<SituacaoCliente, { label: string; color: string }> = {
  em_dia: { label: "Em dia", color: "green" },
  a_vencer: { label: "A vencer", color: "orange" },
  vencido: { label: "Vencido", color: "red" },
  sem_registros: { label: "Sem registros", color: "gray" },
};

/** Colunas do kanban de conformidade no Painel. "sem_registros" fica de fora. */
export const SITUACOES_KANBAN: SituacaoCliente[] = ["vencido", "a_vencer", "em_dia"];

export interface ClienteComSituacao {
  cliente: Cliente;
  situacao: SituacaoCliente;
  /** Vencimento mais urgente do cliente, para ordenar dentro da coluna. */
  proximoVencimento: string | null;
}

/**
 * Agrupa clientes ativos por situação, para o kanban do Painel. Dentro de cada
 * coluna, o mais urgente primeiro — quem está prestes a vencer precisa aparecer
 * no topo, não em ordem alfabética.
 */
export function clientesPorSituacao(
  clientes: Cliente[],
  itens: ItemVencivel[],
  now: Dayjs = dayjs(),
): Record<SituacaoCliente, ClienteComSituacao[]> {
  const grupos: Record<SituacaoCliente, ClienteComSituacao[]> = {
    vencido: [],
    a_vencer: [],
    em_dia: [],
    sem_registros: [],
  };

  for (const cliente of clientes) {
    if (cliente.status !== "ativo") continue;
    const doCliente = itens
      .filter((i) => i.clienteId === cliente.id)
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

    grupos[situacaoCliente(cliente.id, itens, now)].push({
      cliente,
      situacao: situacaoCliente(cliente.id, itens, now),
      proximoVencimento: doCliente[0]?.dataVencimento ?? null,
    });
  }

  for (const lista of Object.values(grupos)) {
    lista.sort((a, b) => {
      if (a.proximoVencimento === null) return 1;
      if (b.proximoVencimento === null) return -1;
      return a.proximoVencimento.localeCompare(b.proximoVencimento);
    });
  }

  return grupos;
}
