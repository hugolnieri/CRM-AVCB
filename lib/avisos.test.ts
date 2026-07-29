import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { avisosPara, contarNaoVistos, type Espectador } from "./avisos";
import { makeLead, makeServico } from "./testFixtures";
import type { Pendencia } from "./painel";
import type { SolicitacaoExclusao } from "@/types/exclusao";
import type { Tarefa } from "@/types/tarefa";

const agora = dayjs("2026-07-29T10:00:00");

const admin: Espectador = { memberId: "m1", isAdmin: true };
const colaborador: Espectador = { memberId: "m2", isAdmin: false };

const vazio = {
  tarefas: [] as Tarefa[],
  pendencias: [] as Pendencia[],
  solicitacoes: [] as SolicitacaoExclusao[],
  leads: [] as ReturnType<typeof makeLead>[],
  servicos: [] as ReturnType<typeof makeServico>[],
};

function makeTarefa(over: Partial<Tarefa> = {}): Tarefa {
  return {
    id: "t1",
    titulo: "Achar instrutor",
    descricao: null,
    prioridade: "normal",
    prazo: null,
    responsavelId: "m2",
    concluidaEm: null,
    concluidaPor: null,
    clienteId: null,
    leadId: null,
    servicoId: null,
    origemPendencia: null,
    createdBy: "m1",
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

function makeSolicitacao(over: Partial<SolicitacaoExclusao> = {}): SolicitacaoExclusao {
  return {
    id: "sol-1",
    entidade: "cliente",
    registroId: "c1",
    rotulo: "Padaria São José",
    motivo: null,
    status: "pendente",
    solicitadoPor: "m2",
    decididoPor: null,
    decididoEm: null,
    observacao: null,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

describe("critério por perfil", () => {
  // O exemplo literal do pedido.
  it("shows admin-queue tasks to admins only", () => {
    const dados = { ...vazio, tarefas: [makeTarefa({ responsavelId: null })] };
    expect(avisosPara(dados, admin, agora).map((a) => a.tipo)).toEqual(["tarefa_admin"]);
    expect(avisosPara(dados, colaborador, agora)).toEqual([]);
  });

  it("shows a deletion request to admins only", () => {
    const dados = { ...vazio, solicitacoes: [makeSolicitacao()] };
    expect(avisosPara(dados, admin, agora)).toHaveLength(1);
    // Nem para quem pediu: quem decide é o administrador.
    expect(avisosPara(dados, colaborador, agora)).toEqual([]);
  });

  it("delivers an assigned task to its owner and nobody else", () => {
    const dados = { ...vazio, tarefas: [makeTarefa({ responsavelId: "m2" })] };
    expect(avisosPara(dados, colaborador, agora)).toHaveLength(1);
    // Nem o admin recebe: é trabalho de outra pessoa, não da administração.
    expect(avisosPara(dados, admin, agora)).toEqual([]);
  });

  it("routes an unassigned lead's follow-up to the admin instead of nobody", () => {
    const dados = {
      ...vazio,
      leads: [
        makeLead({
          id: "l1",
          assignedUserId: null,
          followUpAt: agora.subtract(2, "day").toISOString(),
        }),
      ],
    };
    expect(avisosPara(dados, admin, agora)).toHaveLength(1);
    expect(avisosPara(dados, colaborador, agora)).toEqual([]);
  });

  it("shows admin-only pendências to admins only", () => {
    const dados = {
      ...vazio,
      pendencias: [
        { id: "p1", tipo: "cliente_sem_servico", descricao: "X sem serviço", href: "/clientes/1" },
        { id: "p2", tipo: "servico_sem_instrutor", descricao: "Y sem instrutor", href: "/clientes/1" },
      ] as Pendencia[],
    };
    // A de admin entra; a que todo mundo resolve fica só em /tarefas.
    expect(avisosPara(dados, admin, agora).map((a) => a.id)).toEqual(["pendencia-p1"]);
    expect(avisosPara(dados, colaborador, agora)).toEqual([]);
  });
});

describe("retornos", () => {
  it("separates overdue from due-today", () => {
    const dados = {
      ...vazio,
      leads: [
        makeLead({ id: "a", assignedUserId: "m2", followUpAt: agora.subtract(1, "day").toISOString() }),
        makeLead({ id: "b", assignedUserId: "m2", followUpAt: agora.add(2, "hour").toISOString() }),
      ],
    };
    const tipos = avisosPara(dados, colaborador, agora).map((a) => a.tipo);
    expect(tipos).toContain("retorno_atrasado");
    expect(tipos).toContain("retorno_hoje");
  });

  it("ignores future follow-ups", () => {
    const dados = {
      ...vazio,
      leads: [
        makeLead({ id: "a", assignedUserId: "m2", followUpAt: agora.add(3, "day").toISOString() }),
      ],
    };
    expect(avisosPara(dados, colaborador, agora)).toEqual([]);
  });
});

describe("compromissos", () => {
  it("announces today's scheduled service to whoever is responsible", () => {
    const dados = {
      ...vazio,
      servicos: [
        makeServico({
          id: "s1",
          status: "agendado",
          responsavelId: "m2",
          dataAgendada: agora.add(3, "hour").toISOString(),
          dataRealizacao: null,
        }),
      ],
    };
    expect(avisosPara(dados, colaborador, agora).map((a) => a.tipo)).toEqual(["compromisso_hoje"]);
  });

  it("ignores services scheduled for another day", () => {
    const dados = {
      ...vazio,
      servicos: [
        makeServico({
          id: "s1",
          status: "agendado",
          responsavelId: "m2",
          dataAgendada: agora.add(2, "day").toISOString(),
          dataRealizacao: null,
        }),
      ],
    };
    expect(avisosPara(dados, colaborador, agora)).toEqual([]);
  });
});

describe("ordenação", () => {
  it("puts the most urgent first", () => {
    const dados = {
      ...vazio,
      tarefas: [makeTarefa({ id: "t1", responsavelId: null })],
      leads: [
        makeLead({ id: "l1", assignedUserId: "m1", followUpAt: agora.subtract(1, "day").toISOString() }),
      ],
      pendencias: [
        { id: "p1", tipo: "vencimento_ausente", descricao: "dado incompleto", href: "/x" },
      ] as Pendencia[],
    };
    expect(avisosPara(dados, admin, agora).map((a) => a.tipo)).toEqual([
      "retorno_atrasado",
      "tarefa_admin",
      "pendencia_admin",
    ]);
  });
});

describe("contarNaoVistos", () => {
  it("counts only ids the bell has not stored yet", () => {
    const dados = {
      ...vazio,
      tarefas: [makeTarefa({ id: "t1" }), makeTarefa({ id: "t2" })],
    };
    const avisos = avisosPara(dados, colaborador, agora);
    expect(contarNaoVistos(avisos, [])).toBe(2);
    expect(contarNaoVistos(avisos, ["tarefa-t1"])).toBe(1);
    expect(contarNaoVistos(avisos, ["tarefa-t1", "tarefa-t2"])).toBe(0);
  });

  // Ids determinísticos: o problema que continua existindo continua "visto",
  // então o contador não volta a acender sozinho a cada recarga.
  it("keeps an already-seen problem quiet across reloads", () => {
    const dados = { ...vazio, tarefas: [makeTarefa({ id: "t1" })] };
    const primeira = avisosPara(dados, colaborador, agora);
    const segunda = avisosPara(dados, colaborador, agora.add(1, "hour"));
    expect(contarNaoVistos(segunda, primeira.map((a) => a.id))).toBe(0);
  });
});
