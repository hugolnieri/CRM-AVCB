import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { contarAbertas, filtrarTarefas, listaDeTarefas, type Filtro } from "./tarefas";
import type { Pendencia } from "./painel";
import type { Tarefa } from "@/types/tarefa";

const agora = dayjs("2026-07-29T10:00:00");

function makeTarefa(over: Partial<Tarefa> = {}): Tarefa {
  return {
    id: "t1",
    titulo: "Comprar cilindros para o NR-33",
    descricao: null,
    prioridade: "normal",
    prazo: null,
    responsavelId: "m1",
    concluidaEm: null,
    concluidaPor: null,
    clienteId: null,
    leadId: null,
    servicoId: null,
    origemPendencia: null,
    createdBy: "m1",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    ...over,
  };
}

function makePendencia(over: Partial<Pendencia> = {}): Pendencia {
  return {
    id: "sem-instrutor-s1",
    tipo: "servico_sem_instrutor",
    descricao: "Ki Jóia: NR-35 está sem instrutor definido",
    href: "/clientes/c1",
    ...over,
  };
}

const filtroBase: Filtro = {
  memberId: "m1",
  isAdmin: false,
  escopo: "todas",
  incluirConcluidas: false,
};

describe("listaDeTarefas", () => {
  it("merges manual tasks and derived pendências into one list", () => {
    const itens = listaDeTarefas(
      { tarefas: [makeTarefa()], pendencias: [makePendencia()] },
      agora,
    );
    expect(itens.map((i) => i.origem).sort()).toEqual(["automatica", "manual"]);
  });

  // O ponto do botão "Delegar": uma vez delegada, a pendência não pode aparecer
  // duas vezes, uma delas sem dono.
  it("drops a pendência that already has an open task pointing at it", () => {
    const itens = listaDeTarefas(
      {
        tarefas: [makeTarefa({ origemPendencia: "sem-instrutor-s1" })],
        pendencias: [makePendencia({ id: "sem-instrutor-s1" })],
      },
      agora,
    );
    expect(itens).toHaveLength(1);
    expect(itens[0].origem).toBe("manual");
  });

  // Se a tarefa delegada foi concluída mas o dado continua errado, o problema
  // ainda existe — e volta a aparecer.
  it("brings the pendência back once the delegated task is completed", () => {
    const itens = listaDeTarefas(
      {
        tarefas: [
          makeTarefa({
            origemPendencia: "sem-instrutor-s1",
            concluidaEm: "2026-07-28T10:00:00Z",
            concluidaPor: "m1",
          }),
        ],
        pendencias: [makePendencia({ id: "sem-instrutor-s1" })],
      },
      agora,
    );
    expect(itens.filter((i) => i.origem === "automatica")).toHaveLength(1);
  });

  it("marks a task past its deadline as overdue, but never a completed one", () => {
    const itens = listaDeTarefas(
      {
        tarefas: [
          makeTarefa({ id: "a", prazo: "2026-07-28" }),
          makeTarefa({ id: "b", prazo: "2026-07-30" }),
          makeTarefa({
            id: "c",
            prazo: "2026-07-01",
            concluidaEm: "2026-07-02T10:00:00Z",
            concluidaPor: "m1",
          }),
        ],
        pendencias: [],
      },
      agora,
    );
    const porId = new Map(itens.map((i) => [i.id, i]));
    expect(porId.get("tarefa-a")?.atrasada).toBe(true);
    expect(porId.get("tarefa-b")?.atrasada).toBe(false);
    expect(porId.get("tarefa-c")?.atrasada).toBe(false);
  });

  // Prazo é coluna `date`; comparar as strings evita o new Date que leria
  // "2026-07-29" como UTC e voltaria 28/07 em UTC-3.
  it("treats a task due today as not overdue", () => {
    const itens = listaDeTarefas(
      { tarefas: [makeTarefa({ prazo: "2026-07-29" })], pendencias: [] },
      agora,
    );
    expect(itens[0].atrasada).toBe(false);
  });
});

describe("ordenação", () => {
  it("puts overdue first, then priority, then nearest deadline", () => {
    const itens = listaDeTarefas(
      {
        tarefas: [
          makeTarefa({ id: "sem-prazo", prioridade: "normal" }),
          makeTarefa({ id: "alta", prioridade: "alta", prazo: "2026-08-10" }),
          makeTarefa({ id: "logo", prioridade: "normal", prazo: "2026-07-30" }),
          makeTarefa({ id: "atrasada", prioridade: "baixa", prazo: "2026-07-01" }),
        ],
        pendencias: [],
      },
      agora,
    );
    expect(itens.map((i) => i.id)).toEqual([
      "tarefa-atrasada",
      "tarefa-alta",
      "tarefa-logo",
      "tarefa-sem-prazo",
    ]);
  });

  it("sinks completed tasks to the bottom", () => {
    const itens = listaDeTarefas(
      {
        tarefas: [
          makeTarefa({
            id: "feita",
            prioridade: "alta",
            concluidaEm: "2026-07-28T10:00:00Z",
            concluidaPor: "m1",
          }),
          makeTarefa({ id: "aberta", prioridade: "baixa" }),
        ],
        pendencias: [],
      },
      agora,
    );
    expect(itens.map((i) => i.id)).toEqual(["tarefa-aberta", "tarefa-feita"]);
  });

  it("keeps the severity order computePainel produced for pendências", () => {
    const itens = listaDeTarefas(
      {
        tarefas: [],
        pendencias: [
          makePendencia({ id: "p1", tipo: "vencido" }),
          makePendencia({ id: "p2", tipo: "servico_sem_instrutor" }),
          makePendencia({ id: "p3", tipo: "vencimento_ausente" }),
        ],
      },
      agora,
    );
    expect(itens.map((i) => i.pendenciaId)).toEqual(["p1", "p2", "p3"]);
  });
});

describe("filtrarTarefas", () => {
  it("hides completed tasks unless asked for", () => {
    const itens = listaDeTarefas(
      {
        tarefas: [makeTarefa({ concluidaEm: "2026-07-28T10:00:00Z", concluidaPor: "m1" })],
        pendencias: [],
      },
      agora,
    );
    expect(filtrarTarefas(itens, filtroBase)).toHaveLength(0);
    expect(filtrarTarefas(itens, { ...filtroBase, incluirConcluidas: true })).toHaveLength(1);
  });

  // Não é segurança — a RLS deixa todo mundo ler a tabela. É o que impede a
  // lista de virar ruído para quem não pode resolver aquilo.
  it("keeps admin-only work away from a colaborador", () => {
    const itens = listaDeTarefas(
      {
        tarefas: [makeTarefa({ id: "da-admin", responsavelId: null })],
        pendencias: [
          makePendencia({ id: "p-admin", tipo: "exclusao_solicitada" }),
          makePendencia({ id: "p-todos", tipo: "servico_sem_instrutor" }),
        ],
      },
      agora,
    );

    const doColaborador = filtrarTarefas(itens, filtroBase);
    expect(doColaborador.map((i) => i.id)).toEqual(["pendencia-p-todos"]);

    const doAdmin = filtrarTarefas(itens, { ...filtroBase, isAdmin: true });
    expect(doAdmin).toHaveLength(3);
  });

  it("scopes to what is assigned to me", () => {
    const itens = listaDeTarefas(
      {
        tarefas: [
          makeTarefa({ id: "minha", responsavelId: "m1" }),
          makeTarefa({ id: "de-outro", responsavelId: "m2" }),
        ],
        pendencias: [makePendencia()],
      },
      agora,
    );
    expect(filtrarTarefas(itens, { ...filtroBase, escopo: "minhas" }).map((i) => i.id)).toEqual([
      "tarefa-minha",
    ]);
  });

  it("scopes to the administration's own queue", () => {
    const itens = listaDeTarefas(
      {
        tarefas: [
          makeTarefa({ id: "da-admin", responsavelId: null }),
          makeTarefa({ id: "minha", responsavelId: "m1" }),
        ],
        pendencias: [],
      },
      agora,
    );
    const r = filtrarTarefas(itens, { ...filtroBase, isAdmin: true, escopo: "admin" });
    expect(r.map((i) => i.id)).toEqual(["tarefa-da-admin"]);
  });
});

describe("contarAbertas", () => {
  it("counts only what the viewer can act on", () => {
    const itens = listaDeTarefas(
      {
        tarefas: [makeTarefa({ id: "da-admin", responsavelId: null })],
        pendencias: [makePendencia()],
      },
      agora,
    );
    expect(contarAbertas(itens, { memberId: "m1", isAdmin: false, escopo: "todas" })).toBe(1);
    expect(contarAbertas(itens, { memberId: "m1", isAdmin: true, escopo: "todas" })).toBe(2);
  });
});
