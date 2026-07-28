import dayjs, { type Dayjs } from "dayjs";
import type { Activity } from "@/types/activity";
import type { Lead } from "@/types/lead";
import type { Meta, MetaPeriodo } from "@/types/meta";
import type { Servico } from "@/types/servico";

/** Tipos de atividade que contam como contato. Espelha lib/relatorioDiario.ts. */
const TIPOS_CONTATO = ["call", "whatsapp", "visit", "note", "follow_up"];

export interface Janela {
  /** "YYYY-MM-DD", inclusive. */
  inicio: string;
  fim: string;
}

/**
 * Janela de apuração do período, em datas locais.
 *
 * A semana é calculada com `.day()` (0 = domingo, valor absoluto) e não com
 * `.startOf("week")`: este último depende do locale ativo do dayjs, que NÃO é
 * definido globalmente no projeto — funcionaria por acidente hoje e quebraria no
 * dia em que alguém chamasse `dayjs.locale("pt-br")`. Mesma precaução de
 * components/shared/AgendaCalendar.tsx.
 *
 * Semana e mês são de calendário, não janelas móveis: "meta semanal" para uma
 * pessoa significa a semana corrente, não os últimos 7 dias. (É o oposto de
 * lib/vencimentos.ts, onde janela móvel é o certo — lá não existe "a semana do
 * vencimento", só distância até ele.)
 */
export function janelaDoPeriodo(periodo: MetaPeriodo, agora: Dayjs = dayjs()): Janela {
  if (periodo === "diaria") {
    const dia = agora.format("YYYY-MM-DD");
    return { inicio: dia, fim: dia };
  }
  if (periodo === "semanal") {
    const domingo = agora.subtract(agora.day(), "day");
    return {
      inicio: domingo.format("YYYY-MM-DD"),
      fim: domingo.add(6, "day").format("YYYY-MM-DD"),
    };
  }
  return {
    inicio: agora.startOf("month").format("YYYY-MM-DD"),
    fim: agora.endOf("month").format("YYYY-MM-DD"),
  };
}

/** Meta está valendo hoje? Considera `ativa` e a vigência opcional. */
export function metaVigente(meta: Meta, agora: Dayjs = dayjs()): boolean {
  if (!meta.ativa) return false;
  const hoje = agora.format("YYYY-MM-DD");
  if (meta.inicioEm && hoje < meta.inicioEm) return false;
  if (meta.fimEm && hoje > meta.fimEm) return false;
  return true;
}

/** Metas que se aplicam a uma pessoa: as dela mais as da equipe (memberId null). */
export function metasDoMembro(metas: Meta[], memberId: string, agora: Dayjs = dayjs()): Meta[] {
  return metas.filter(
    (m) => metaVigente(m, agora) && (m.memberId === null || m.memberId === memberId),
  );
}

export interface ProgressoMeta {
  meta: Meta;
  memberId: string;
  realizado: number;
  alvo: number;
  /** 0-100, limitado em 100 para a barra não estourar. */
  percentual: number;
  cumprida: boolean;
  janela: Janela;
}

interface Dados {
  activities: Activity[];
  leads: Lead[];
  servicos: Servico[];
}

/** Dia local de um timestamp, no formato das colunas `date`. */
function dia(iso: string): string {
  return dayjs(iso).format("YYYY-MM-DD");
}

function dentro(data: string, janela: Janela): boolean {
  return data >= janela.inicio && data <= janela.fim;
}

/**
 * Quanto a pessoa realizou da métrica, dentro da janela do período.
 *
 * Derivado a cada leitura, nunca armazenado: uma coluna de progresso estaria
 * errada no instante seguinte a qualquer registro, e obrigaria recálculo em todo
 * caminho de escrita.
 */
export function calcularRealizado(
  meta: Meta,
  memberId: string,
  { activities, leads, servicos }: Dados,
  agora: Dayjs = dayjs(),
): number {
  const janela = janelaDoPeriodo(meta.periodo, agora);

  switch (meta.metrica) {
    case "contatos_lead": {
      // Leads distintos, não atividades: cinco ligações para a mesma empresa
      // valem um lead contatado.
      const leadsContatados = new Set(
        activities
          .filter(
            (a) =>
              a.authorId === memberId &&
              a.leadId !== null &&
              TIPOS_CONTATO.includes(a.activityType) &&
              dentro(dia(a.createdAt), janela),
          )
          .map((a) => a.leadId as string),
      );
      return leadsContatados.size;
    }

    case "atividades":
      return activities.filter(
        (a) =>
          a.authorId === memberId &&
          TIPOS_CONTATO.includes(a.activityType) &&
          dentro(dia(a.createdAt), janela),
      ).length;

    case "fechamentos":
      return activities.filter(
        (a) =>
          a.authorId === memberId &&
          a.activityType === "converted" &&
          dentro(dia(a.createdAt), janela),
      ).length;

    case "leads_novos":
      return leads.filter(
        (l) => l.assignedUserId === memberId && dentro(dia(l.createdAt), janela),
      ).length;

    case "servicos_realizados":
      return servicos.filter(
        (s) =>
          s.status === "realizado" &&
          s.responsavelId === memberId &&
          s.dataRealizacao !== null &&
          dentro(s.dataRealizacao, janela),
      ).length;

    case "valor_fechado": {
      // Usa a atividade de conversão para saber QUANDO fechou, e o lead para
      // saber QUANTO: o valor mora no lead, a data do fechamento não.
      const idsFechados = new Set(
        activities
          .filter(
            (a) =>
              a.authorId === memberId &&
              a.activityType === "converted" &&
              a.leadId !== null &&
              dentro(dia(a.createdAt), janela),
          )
          .map((a) => a.leadId as string),
      );
      return leads
        .filter((l) => idsFechados.has(l.id))
        .reduce((soma, l) => soma + (l.valorEstimado ?? 0), 0);
    }
  }
}

export function progressoMeta(
  meta: Meta,
  memberId: string,
  dados: Dados,
  agora: Dayjs = dayjs(),
): ProgressoMeta {
  const realizado = calcularRealizado(meta, memberId, dados, agora);
  return {
    meta,
    memberId,
    realizado,
    alvo: meta.alvo,
    percentual: meta.alvo > 0 ? Math.min(100, Math.round((realizado / meta.alvo) * 100)) : 0,
    cumprida: realizado >= meta.alvo,
    janela: janelaDoPeriodo(meta.periodo, agora),
  };
}

/** Progresso de todas as metas vigentes de uma pessoa, mais urgente primeiro. */
export function progressoDoMembro(
  metas: Meta[],
  memberId: string,
  dados: Dados,
  agora: Dayjs = dayjs(),
): ProgressoMeta[] {
  return metasDoMembro(metas, memberId, agora)
    .map((meta) => progressoMeta(meta, memberId, dados, agora))
    .sort((a, b) => {
      // Pendentes antes de cumpridas; entre pendentes, a mais atrasada primeiro.
      if (a.cumprida !== b.cumprida) return a.cumprida ? 1 : -1;
      return a.percentual - b.percentual;
    });
}

export function corDoProgresso(percentual: number): string {
  if (percentual >= 100) return "green";
  if (percentual >= 60) return "blue";
  if (percentual >= 30) return "yellow";
  return "red";
}
