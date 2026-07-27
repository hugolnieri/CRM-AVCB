import dayjs, { type Dayjs } from "dayjs";
import { nomeCliente, type Cliente } from "@/types/cliente";
import type { Servico } from "@/types/servico";
import type { Treinamento } from "@/types/treinamento";

export type VencimentoBucket = "vencido" | "esta_semana" | "este_mes" | "futuro";

export type SituacaoCliente = "em_dia" | "a_vencer" | "vencido" | "sem_registros";

/** Um treinamento ou serviço com data de vencimento, achatado para exibição. */
export interface ItemVencivel {
  id: string;
  origem: "treinamento" | "servico";
  clienteId: string;
  clienteNome: string;
  /** Nome do treinamento ou tipo do serviço. */
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
 * de followUpBucket em lib/followup.ts: um treinamento que vence hoje ainda vale
 * hoje, e não deve piscar como vencido o dia inteiro.
 *
 * As janelas são MÓVEIS (+7 e +30 dias), não de calendário. Usar
 * dayjs().endOf("week") pareceria mais fiel a "vence esta semana", mas
 * `dayjs.locale("pt-br")` nunca é chamado globalmente (o DatesProvider em
 * app/providers.tsx configura só os componentes do Mantine), então endOf("week")
 * usaria o locale `en` em silêncio. Janela móvel é livre de locale, determinística
 * e testável.
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
 * Achata treinamentos e serviços num único fluxo de itens que vencem, ordenado do
 * mais urgente ao mais distante. Registros sem data de vencimento ficam de fora:
 * não vencem, então não pertencem a este controle.
 */
export function itensVenciveis(
  treinamentos: Treinamento[],
  servicos: Servico[],
  clientes: Cliente[],
): ItemVencivel[] {
  const nomePorId = new Map(clientes.map((c) => [c.id, nomeCliente(c)]));

  const deTreinamentos: ItemVencivel[] = treinamentos
    .filter((t) => t.dataVencimento !== null)
    .map((t) => ({
      id: t.id,
      origem: "treinamento",
      clienteId: t.clienteId,
      clienteNome: nomePorId.get(t.clienteId) ?? "Cliente removido",
      descricao: t.tipoNome,
      dataVencimento: t.dataVencimento as string,
    }));

  const deServicos: ItemVencivel[] = servicos
    .filter((s) => s.dataProxima !== null)
    .map((s) => ({
      id: s.id,
      origem: "servico",
      clienteId: s.clienteId,
      clienteNome: nomePorId.get(s.clienteId) ?? "Cliente removido",
      descricao: s.tipo,
      dataVencimento: s.dataProxima as string,
    }));

  return [...deTreinamentos, ...deServicos].sort((a, b) =>
    a.dataVencimento.localeCompare(b.dataVencimento),
  );
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
 * no banco ficaria desatualizada no dia em que um treinamento vencesse sem que
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
