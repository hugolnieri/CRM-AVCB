import dayjs, { type Dayjs } from "dayjs";
import { PENDENCIAS_DE_ADMIN, PENDENCIA_LABELS, type Pendencia } from "@/lib/painel";
import type { Lead } from "@/types/lead";
import type { Servico } from "@/types/servico";
import type { Tarefa } from "@/types/tarefa";
import type { SolicitacaoExclusao } from "@/types/exclusao";

/**
 * O sino do cabeçalho.
 *
 * Nada aqui é armazenado — os avisos são derivados do que já está carregado, no
 * mesmo espírito de `situacaoCliente` e do progresso das metas. Um aviso
 * armazenado estaria errado no instante seguinte a alguém resolver o problema.
 *
 * O critério por perfil, que é o coração do pedido, mora na tabela
 * `AVISO_REGRAS`: cada tipo declara quem o recebe, e `avisosPara` é a única
 * função que decide. Sem isso a regra se espalharia por seis `if` na interface.
 */

export type AvisoTipo =
  | "tarefa_atribuida"
  | "tarefa_admin"
  | "exclusao_pendente"
  | "pendencia_admin"
  | "retorno_atrasado"
  | "retorno_hoje"
  | "compromisso_hoje";

/**
 * - `dono`  — só quem é responsável pelo registro;
 * - `admin` — só administradores;
 * - `todos` — qualquer pessoa autenticada.
 */
export type PublicoAviso = "dono" | "admin" | "todos";

export type SeveridadeAviso = "alta" | "media" | "baixa";

export const AVISO_REGRAS: Record<
  AvisoTipo,
  { publico: PublicoAviso; severidade: SeveridadeAviso; label: string; color: string }
> = {
  retorno_atrasado: { publico: "dono", severidade: "alta", label: "Retorno atrasado", color: "red" },
  exclusao_pendente: {
    publico: "admin",
    severidade: "alta",
    label: "Exclusão pedida",
    color: "red",
  },
  tarefa_admin: { publico: "admin", severidade: "alta", label: "Tarefa da administração", color: "orange" },
  tarefa_atribuida: { publico: "dono", severidade: "media", label: "Sua tarefa", color: "blue" },
  compromisso_hoje: { publico: "dono", severidade: "media", label: "Hoje", color: "grape" },
  retorno_hoje: { publico: "dono", severidade: "media", label: "Retorno hoje", color: "blue" },
  pendencia_admin: { publico: "admin", severidade: "baixa", label: "Pendência", color: "gray" },
};

export interface Aviso {
  /** Determinístico: o mesmo problema mantém o mesmo id entre recargas. */
  id: string;
  tipo: AvisoTipo;
  titulo: string;
  href: string | null;
  /** Null = vale para qualquer um dentro do público do tipo. */
  donoId: string | null;
}

interface Dados {
  tarefas: Tarefa[];
  pendencias: Pendencia[];
  solicitacoes: SolicitacaoExclusao[];
  leads: Lead[];
  servicos: Servico[];
}

export interface Espectador {
  memberId: string | null;
  isAdmin: boolean;
}

const ORDEM_SEVERIDADE: Record<SeveridadeAviso, number> = { alta: 0, media: 1, baixa: 2 };

/**
 * Desempate dentro da mesma severidade: a ordem em que os tipos aparecem em
 * `AVISO_REGRAS`. Ela carrega intenção — retorno atrasado antes de pedido de
 * exclusão, pedido antes de tarefa da administração — enquanto ordenar pelo
 * texto do aviso seria alfabético e portanto arbitrário.
 */
const ORDEM_TIPO = Object.fromEntries(
  Object.keys(AVISO_REGRAS).map((tipo, indice) => [tipo, indice]),
) as Record<AvisoTipo, number>;

/**
 * Os avisos que esta pessoa deve ver, do mais urgente ao menos.
 *
 * A regra que o pedido descreve — "só administradores vão ver que chegou nova
 * tarefa de administrador" — sai daqui, do cruzamento entre `publico` e quem
 * está olhando.
 */
export function avisosPara(dados: Dados, espectador: Espectador, agora: Dayjs = dayjs()): Aviso[] {
  const hoje = agora.format("YYYY-MM-DD");

  const todos: Aviso[] = [
    ...avisosDeTarefas(dados.tarefas),
    ...avisosDeExclusao(dados.solicitacoes),
    ...avisosDePendencias(dados.pendencias),
    ...avisosDeRetorno(dados.leads, hoje),
    ...avisosDeCompromisso(dados.servicos, hoje),
  ];

  return todos.filter((aviso) => podeVer(aviso, espectador)).sort(compararAvisos);
}

/**
 * Quem vê o quê.
 *
 * O caso do lead sem responsável merece nota: em vez de sumir para todo mundo,
 * ele cai para o administrador. Aviso que não é de ninguém não é aviso.
 */
function podeVer(aviso: Aviso, { memberId, isAdmin }: Espectador): boolean {
  const { publico } = AVISO_REGRAS[aviso.tipo];

  if (publico === "todos") return true;
  if (publico === "admin") return isAdmin;

  // publico === "dono"
  if (aviso.donoId === null) return isAdmin;
  return aviso.donoId === memberId;
}

function compararAvisos(a: Aviso, b: Aviso): number {
  const severidade =
    ORDEM_SEVERIDADE[AVISO_REGRAS[a.tipo].severidade] -
    ORDEM_SEVERIDADE[AVISO_REGRAS[b.tipo].severidade];
  if (severidade !== 0) return severidade;

  const tipo = ORDEM_TIPO[a.tipo] - ORDEM_TIPO[b.tipo];
  if (tipo !== 0) return tipo;

  return a.titulo.localeCompare(b.titulo, "pt-BR");
}

function avisosDeTarefas(tarefas: Tarefa[]): Aviso[] {
  return tarefas
    .filter((t) => t.concluidaEm === null)
    .map((t) => ({
      id: `tarefa-${t.id}`,
      // Sem responsável = da administração, e o público muda junto.
      tipo: t.responsavelId === null ? ("tarefa_admin" as const) : ("tarefa_atribuida" as const),
      titulo: t.titulo,
      href: "/tarefas",
      donoId: t.responsavelId,
    }));
}

function avisosDeExclusao(solicitacoes: SolicitacaoExclusao[]): Aviso[] {
  return solicitacoes
    .filter((s) => s.status === "pendente")
    .map((s) => ({
      id: `exclusao-${s.id}`,
      tipo: "exclusao_pendente" as const,
      titulo: `Pedido de exclusão: ${s.rotulo}`,
      href: s.entidade === "cliente" ? `/clientes/${s.registroId}` : "/leads",
      donoId: null,
    }));
}

/**
 * Pendências do painel que exigem administrador. As demais já aparecem em
 * /tarefas para todo mundo — repeti-las no sino seria barulho.
 */
function avisosDePendencias(pendencias: Pendencia[]): Aviso[] {
  return pendencias
    .filter((p) => PENDENCIAS_DE_ADMIN.has(p.tipo) && p.tipo !== "exclusao_solicitada")
    .map((p) => ({
      id: `pendencia-${p.id}`,
      tipo: "pendencia_admin" as const,
      titulo: `${PENDENCIA_LABELS[p.tipo].label}: ${p.descricao}`,
      href: p.href,
      donoId: null,
    }));
}

/**
 * Retornos do dono do lead. `follow_up_at` é timestamptz, então vira dia local
 * aqui antes de comparar — a mesma conversão que a Agenda faz.
 */
function avisosDeRetorno(leads: Lead[], hoje: string): Aviso[] {
  return leads.flatMap((lead) => {
    if (!lead.followUpAt) return [];
    const dia = dayjs(lead.followUpAt).format("YYYY-MM-DD");
    if (dia > hoje) return [];

    // Comparação de string "YYYY-MM-DD": ordem lexicográfica é cronológica, e
    // hoje nunca conta como atrasado.
    const atrasado = dia < hoje;
    return [
      {
        id: `retorno-${lead.id}`,
        tipo: atrasado ? ("retorno_atrasado" as const) : ("retorno_hoje" as const),
        titulo: atrasado
          ? `Retorno atrasado: ${lead.name} (${dayjs(dia).format("DD/MM")})`
          : `Retornar hoje: ${lead.name}`,
        href: "/leads",
        donoId: lead.assignedUserId,
      },
    ];
  });
}

function avisosDeCompromisso(servicos: Servico[], hoje: string): Aviso[] {
  return servicos
    .filter(
      (s) =>
        s.status === "agendado" &&
        s.dataAgendada !== null &&
        dayjs(s.dataAgendada).format("YYYY-MM-DD") === hoje,
    )
    .map((s) => ({
      id: `compromisso-${s.id}`,
      tipo: "compromisso_hoje" as const,
      titulo: `Hoje às ${dayjs(s.dataAgendada).format("HH:mm")}: ${s.tipoNome}`,
      href: `/clientes/${s.clienteId}`,
      donoId: s.responsavelId,
    }));
}

/**
 * Quantos ainda não foram vistos.
 *
 * `vistos` é a lista de ids que o sino guardou da última abertura. Como os ids
 * são determinísticos, um problema que continua existindo permanece "visto" —
 * e só um aviso genuinamente novo volta a acender o contador.
 */
export function contarNaoVistos(avisos: Aviso[], vistos: string[]): number {
  const conhecidos = new Set(vistos);
  return avisos.filter((a) => !conhecidos.has(a.id)).length;
}
