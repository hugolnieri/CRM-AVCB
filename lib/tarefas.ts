import dayjs, { type Dayjs } from "dayjs";
import {
  PENDENCIAS_DE_ADMIN,
  PENDENCIA_LABELS,
  type Pendencia,
  type PendenciaTipo,
} from "@/lib/painel";
import { PRIORIDADE_ORDEM, type Tarefa, type TarefaPrioridade } from "@/types/tarefa";

/**
 * Uma linha da lista de tarefas — manual ou calculada.
 *
 * As duas convivem numa lista só porque, para quem trabalha, "achar um
 * instrutor" é a mesma coisa venha de onde vier. O que muda é o que fecha o
 * item: a manual precisa de alguém marcando concluída; a automática fecha
 * sozinha quando o dado que a gerou é corrigido.
 */
export interface ItemTarefa {
  id: string;
  origem: "manual" | "automatica";
  titulo: string;
  prioridade: TarefaPrioridade;
  prazo: string | null;
  responsavelId: string | null;
  href: string | null;
  concluida: boolean;
  /** Atrasada = prazo antes de hoje e ainda aberta. */
  atrasada: boolean;
  /** Só nas automáticas: `Pendencia.id`, que o botão "Delegar" carrega. */
  pendenciaId?: string;
  /** Só nas automáticas: o tipo, que decide quem vê e como rotular. */
  pendenciaTipo?: PendenciaTipo;
  /** Só nas manuais: a linha completa, para editar e concluir. */
  tarefa?: Tarefa;
}

interface Entrada {
  tarefas: Tarefa[];
  pendencias: Pendencia[];
}

export interface Filtro {
  memberId: string | null;
  isAdmin: boolean;
  /** "minhas" = atribuídas a mim; "admin" = da administração; "todas" = tudo. */
  escopo: "minhas" | "admin" | "todas";
  incluirConcluidas: boolean;
}

/**
 * Funde as duas origens numa lista ordenada.
 *
 * A pendência já delegada é descartada: uma vez que existe tarefa apontando
 * para ela (`origemPendencia`), mostrar as duas faria o mesmo problema aparecer
 * duas vezes — uma delas sem dono.
 */
export function listaDeTarefas(
  { tarefas, pendencias }: Entrada,
  agora: Dayjs = dayjs(),
): ItemTarefa[] {
  const hoje = agora.format("YYYY-MM-DD");

  const delegadas = new Set(
    tarefas.filter((t) => t.origemPendencia && !t.concluidaEm).map((t) => t.origemPendencia),
  );

  const manuais: ItemTarefa[] = tarefas.map((t) => ({
    id: `tarefa-${t.id}`,
    origem: "manual",
    titulo: t.titulo,
    prioridade: t.prioridade,
    prazo: t.prazo,
    responsavelId: t.responsavelId,
    href: hrefDaTarefa(t),
    concluida: t.concluidaEm !== null,
    // Comparação de string "YYYY-MM-DD": ordem lexicográfica é ordem
    // cronológica, e não passa por `new Date` — a mesma cautela de fuso do
    // resto do projeto com coluna `date`.
    atrasada: t.concluidaEm === null && t.prazo !== null && t.prazo < hoje,
    tarefa: t,
  }));

  const automaticas: ItemTarefa[] = pendencias
    .filter((p) => !delegadas.has(p.id))
    .map((p) => ({
      id: `pendencia-${p.id}`,
      origem: "automatica",
      titulo: p.descricao,
      // Pendência não tem prioridade declarada; a severidade vem da ordem em
      // que `computePainel` as monta, preservada aqui pelo `sort` estável.
      prioridade: "normal",
      prazo: null,
      responsavelId: null,
      href: p.href,
      concluida: false,
      atrasada: false,
      pendenciaId: p.id,
      pendenciaTipo: p.tipo,
    }));

  return [...manuais, ...automaticas].sort(comparar);
}

/** Onde clicar leva. Serviço não tem página própria: cai no cliente. */
function hrefDaTarefa(t: Tarefa): string | null {
  if (t.clienteId) return `/clientes/${t.clienteId}`;
  if (t.leadId) return "/leads";
  return null;
}

/**
 * Aberta antes de concluída; dentro das abertas, atrasada primeiro, depois
 * prioridade, depois prazo mais próximo. Manual antes de automática no empate —
 * tarefa com dono é compromisso de alguém, pendência é do sistema.
 */
function comparar(a: ItemTarefa, b: ItemTarefa): number {
  if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
  if (a.atrasada !== b.atrasada) return a.atrasada ? -1 : 1;

  const prioridade = PRIORIDADE_ORDEM[a.prioridade] - PRIORIDADE_ORDEM[b.prioridade];
  if (prioridade !== 0) return prioridade;

  // Sem prazo vai para o fim: o que tem data marcada é mais urgente que o que
  // não tem.
  if (a.prazo !== b.prazo) {
    if (a.prazo === null) return 1;
    if (b.prazo === null) return -1;
    return a.prazo < b.prazo ? -1 : 1;
  }

  if (a.origem !== b.origem) return a.origem === "manual" ? -1 : 1;
  return 0;
}

/**
 * O recorte de quem está olhando.
 *
 * Regra que importa: um colaborador **não** vê pendência de administrador nem
 * tarefa da administração. Não é segurança (a RLS deixa todo mundo ler a
 * tabela) — é o que impede a lista de virar ruído para quem não pode resolver
 * aquilo.
 */
export function filtrarTarefas(itens: ItemTarefa[], filtro: Filtro): ItemTarefa[] {
  return itens.filter((item) => {
    if (item.concluida && !filtro.incluirConcluidas) return false;

    const daAdministracao =
      item.origem === "automatica"
        ? item.pendenciaTipo !== undefined && PENDENCIAS_DE_ADMIN.has(item.pendenciaTipo)
        : item.responsavelId === null;

    if (daAdministracao && !filtro.isAdmin) return false;

    if (filtro.escopo === "minhas") {
      return filtro.memberId !== null && item.responsavelId === filtro.memberId;
    }
    if (filtro.escopo === "admin") return daAdministracao;
    return true;
  });
}

/** Rótulo e cor de um item automático, para a interface não repetir o mapa. */
export function etiquetaDoItem(item: ItemTarefa): { label: string; color: string } | null {
  return item.pendenciaTipo ? PENDENCIA_LABELS[item.pendenciaTipo] : null;
}

/** Quantas exigem ação de quem está olhando — alimenta o selo do menu. */
export function contarAbertas(itens: ItemTarefa[], filtro: Omit<Filtro, "incluirConcluidas">): number {
  return filtrarTarefas(itens, { ...filtro, incluirConcluidas: false }).length;
}
