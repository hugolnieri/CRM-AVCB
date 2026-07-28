import dayjs from "dayjs";
import type { Activity, ActivityType } from "@/types/activity";
import type { RegistroDiario } from "@/types/jornada";
import type { Servico } from "@/types/servico";
import type { TeamMember } from "@/types/team";

/**
 * Tipos de atividade que contam como "contato com lead". `stage_change` e
 * `converted` ficam de fora de propósito: mover um card ou converter não é
 * contato, e contá-los inflaria o número que mede prospecção.
 */
const TIPOS_CONTATO: ActivityType[] = ["call", "whatsapp", "visit", "note", "follow_up"];

export interface LinhaRelatorio {
  memberId: string;
  nome: string;
  /** "YYYY-MM-DD". */
  data: string;
  inicioAt: string | null;
  fimAt: string | null;
  /** Horas trabalhadas, quando início e fim existem. */
  horas: number | null;
  contatos: number;
  fechamentos: number;
  servicosRealizados: number;
  observacoes: string | null;
}

interface Entrada {
  membros: TeamMember[];
  registros: RegistroDiario[];
  activities: Activity[];
  servicos: Servico[];
}

/** Dia local de um timestamp, no mesmo formato das colunas `date`. */
function diaDe(iso: string): string {
  return dayjs(iso).format("YYYY-MM-DD");
}

/**
 * Uma linha por colaborador por dia em que houve qualquer sinal de trabalho:
 * jornada registrada, atividade lançada ou serviço realizado.
 *
 * Dias sem nenhum sinal não viram linha — um relatório cheio de zeros esconde os
 * dias que importam.
 */
export function computeRelatorioDiario(
  { membros, registros, activities, servicos }: Entrada,
  diasAtras = 30,
  agora = dayjs(),
): LinhaRelatorio[] {
  const limite = agora.subtract(diasAtras, "day").format("YYYY-MM-DD");
  const nomePorId = new Map(membros.map((m) => [m.id, m.fullName]));

  // Chave "memberId|data" -> agregação.
  const linhas = new Map<string, LinhaRelatorio>();

  const obter = (memberId: string, data: string): LinhaRelatorio => {
    const chave = `${memberId}|${data}`;
    let linha = linhas.get(chave);
    if (!linha) {
      linha = {
        memberId,
        nome: nomePorId.get(memberId) ?? "Usuário removido",
        data,
        inicioAt: null,
        fimAt: null,
        horas: null,
        contatos: 0,
        fechamentos: 0,
        servicosRealizados: 0,
        observacoes: null,
      };
      linhas.set(chave, linha);
    }
    return linha;
  };

  for (const registro of registros) {
    if (registro.data < limite) continue;
    const linha = obter(registro.memberId, registro.data);
    linha.inicioAt = registro.inicioAt;
    linha.fimAt = registro.fimAt;
    linha.observacoes = registro.observacoes;
    linha.horas =
      registro.inicioAt && registro.fimAt
        ? Math.round((dayjs(registro.fimAt).diff(dayjs(registro.inicioAt), "minute") / 60) * 10) / 10
        : null;
  }

  for (const activity of activities) {
    if (!activity.authorId) continue;
    const data = diaDe(activity.createdAt);
    if (data < limite) continue;
    const linha = obter(activity.authorId, data);
    if (TIPOS_CONTATO.includes(activity.activityType)) linha.contatos += 1;
    if (activity.activityType === "converted") linha.fechamentos += 1;
  }

  for (const servico of servicos) {
    if (servico.status !== "realizado" || !servico.responsavelId || !servico.dataRealizacao) continue;
    if (servico.dataRealizacao < limite) continue;
    obter(servico.responsavelId, servico.dataRealizacao).servicosRealizados += 1;
  }

  return Array.from(linhas.values()).sort((a, b) => {
    if (a.data !== b.data) return b.data.localeCompare(a.data);
    return a.nome.localeCompare(b.nome);
  });
}

/** Totais do período, para os cartões acima da tabela. */
export function totaisRelatorio(linhas: LinhaRelatorio[]) {
  return {
    contatos: linhas.reduce((s, l) => s + l.contatos, 0),
    fechamentos: linhas.reduce((s, l) => s + l.fechamentos, 0),
    servicosRealizados: linhas.reduce((s, l) => s + l.servicosRealizados, 0),
    diasTrabalhados: linhas.filter((l) => l.inicioAt !== null).length,
  };
}
