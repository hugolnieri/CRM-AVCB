import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  calcularRealizado,
  janelaDoPeriodo,
  metaVigente,
  metasDoMembro,
  progressoDoMembro,
  progressoMeta,
} from "./metas";
import { makeLead, makeServico } from "./testFixtures";
import type { Activity, ActivityType } from "@/types/activity";
import type { Lead } from "@/types/lead";
import type { Meta, MetaMetrica, MetaPeriodo } from "@/types/meta";
import type { Servico } from "@/types/servico";

// Quarta-feira, 29/07/2026. Domingo dessa semana = 26/07.
const agora = dayjs("2026-07-29T14:00:00");

function makeMeta(over: Partial<Meta> = {}): Meta {
  return {
    id: "meta-1",
    memberId: "m1",
    nome: "Contatar 40 leads por dia",
    metrica: "contatos_lead",
    periodo: "diaria",
    alvo: 40,
    ativa: true,
    inicioEm: null,
    fimEm: null,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

function act(
  authorId: string | null,
  tipo: ActivityType,
  quandoDias: number,
  leadId: string | null = "l1",
): Activity {
  return {
    id: Math.random().toString(),
    leadId,
    clienteId: leadId ? null : "c1",
    authorId,
    activityType: tipo,
    body: null,
    metadata: null,
    createdAt: agora.subtract(quandoDias, "day").toISOString(),
  };
}

interface Dados {
  activities: Activity[];
  leads: Lead[];
  servicos: Servico[];
}

// Tipado explicitamente: inferido, `[]` vira never[] e o helper `medir` nao
// aceita nada.
const vazio: Dados = { activities: [], leads: [], servicos: [] };

describe("janelaDoPeriodo", () => {
  it("uses a single day for daily goals", () => {
    expect(janelaDoPeriodo("diaria", agora)).toEqual({
      inicio: "2026-07-29",
      fim: "2026-07-29",
    });
  });

  // Semana de calendário começando no domingo, calculada sem depender do locale
  // do dayjs (que não é configurado globalmente neste projeto).
  it("uses the calendar week, Sunday to Saturday", () => {
    expect(janelaDoPeriodo("semanal", agora)).toEqual({
      inicio: "2026-07-26",
      fim: "2026-08-01",
    });
  });

  it("keeps the week stable no matter which weekday it is asked on", () => {
    const domingo = dayjs("2026-07-26T08:00:00");
    const sabado = dayjs("2026-08-01T23:00:00");
    expect(janelaDoPeriodo("semanal", domingo)).toEqual(janelaDoPeriodo("semanal", sabado));
  });

  it("uses the calendar month", () => {
    expect(janelaDoPeriodo("mensal", agora)).toEqual({
      inicio: "2026-07-01",
      fim: "2026-07-31",
    });
  });
});

describe("metaVigente", () => {
  it("ignores inactive goals", () => {
    expect(metaVigente(makeMeta({ ativa: false }), agora)).toBe(false);
  });

  it("respects an optional validity window", () => {
    expect(metaVigente(makeMeta({ inicioEm: "2026-08-01" }), agora)).toBe(false);
    expect(metaVigente(makeMeta({ fimEm: "2026-07-28" }), agora)).toBe(false);
    expect(metaVigente(makeMeta({ inicioEm: "2026-07-01", fimEm: "2026-07-31" }), agora)).toBe(true);
  });

  it("treats the boundary days as inside the window", () => {
    expect(metaVigente(makeMeta({ inicioEm: "2026-07-29" }), agora)).toBe(true);
    expect(metaVigente(makeMeta({ fimEm: "2026-07-29" }), agora)).toBe(true);
  });
});

describe("metasDoMembro", () => {
  it("includes the person's own goals and the team-wide ones", () => {
    const metas = [
      makeMeta({ id: "minha", memberId: "m1" }),
      makeMeta({ id: "equipe", memberId: null }),
      makeMeta({ id: "de-outro", memberId: "m2" }),
      makeMeta({ id: "inativa", memberId: "m1", ativa: false }),
    ];
    expect(metasDoMembro(metas, "m1", agora).map((m) => m.id)).toEqual(["minha", "equipe"]);
  });
});

describe("calcularRealizado", () => {
  const medir = (metrica: MetaMetrica, dados: Partial<Dados>, periodo: MetaPeriodo = "diaria") =>
    calcularRealizado(makeMeta({ metrica, periodo }), "m1", { ...vazio, ...dados }, agora);

  it("counts distinct leads for contatos_lead, not the number of activities", () => {
    const dados = {
      activities: [
        act("m1", "call", 0, "lead-a"),
        act("m1", "whatsapp", 0, "lead-a"), // mesmo lead: nao conta de novo
        act("m1", "visit", 0, "lead-b"),
      ],
    };
    expect(medir("contatos_lead", dados)).toBe(2);
    // A mesma base medida como atividades conta as tres.
    expect(medir("atividades", dados)).toBe(3);
  });

  it("ignores other people's activities", () => {
    expect(
      medir("contatos_lead", { activities: [act("m2", "call", 0, "lead-a")] }),
    ).toBe(0);
  });

  it("ignores activities outside the window", () => {
    expect(medir("contatos_lead", { activities: [act("m1", "call", 1, "lead-a")] })).toBe(0);
    expect(
      medir("contatos_lead", { activities: [act("m1", "call", 1, "lead-a")] }, "semanal"),
    ).toBe(1);
  });

  it("does not count stage changes or conversions as contact", () => {
    expect(
      medir("contatos_lead", {
        activities: [act("m1", "stage_change", 0, "lead-a"), act("m1", "converted", 0, "lead-a")],
      }),
    ).toBe(0);
  });

  it("counts conversions for fechamentos", () => {
    expect(
      medir("fechamentos", {
        activities: [act("m1", "converted", 0, "lead-a"), act("m1", "call", 0, "lead-a")],
      }),
    ).toBe(1);
  });

  it("counts leads created and assigned to the person", () => {
    const dados = {
      leads: [
        makeLead({ id: "a", assignedUserId: "m1", createdAt: agora.toISOString() }),
        makeLead({ id: "b", assignedUserId: "m2", createdAt: agora.toISOString() }),
        makeLead({ id: "c", assignedUserId: "m1", createdAt: agora.subtract(5, "day").toISOString() }),
      ],
    };
    expect(medir("leads_novos", dados)).toBe(1);
  });

  it("counts only completed services where the person is responsible", () => {
    const hoje = agora.format("YYYY-MM-DD");
    const dados = {
      servicos: [
        makeServico({ id: "s1", responsavelId: "m1", dataRealizacao: hoje }),
        makeServico({ id: "s2", responsavelId: "m2", dataRealizacao: hoje }),
        makeServico({
          id: "s3",
          responsavelId: "m1",
          status: "agendado",
          dataRealizacao: null,
          dataAgendada: agora.toISOString(),
        }),
      ],
    };
    expect(medir("servicos_realizados", dados)).toBe(1);
  });

  it("sums the value of leads closed in the window", () => {
    const dados = {
      activities: [act("m1", "converted", 0, "lead-a"), act("m1", "converted", 0, "lead-b")],
      leads: [
        makeLead({ id: "lead-a", valorEstimado: 5000 }),
        makeLead({ id: "lead-b", valorEstimado: null }),
        makeLead({ id: "lead-c", valorEstimado: 9999 }), // nao foi fechado
      ],
    };
    expect(medir("valor_fechado", dados)).toBe(5000);
  });
});

describe("progressoMeta", () => {
  it("computes percentage and completion", () => {
    const dados = {
      ...vazio,
      activities: [act("m1", "call", 0, "a"), act("m1", "call", 0, "b")],
    };
    const p = progressoMeta(makeMeta({ alvo: 4 }), "m1", dados, agora);
    expect(p).toMatchObject({ realizado: 2, alvo: 4, percentual: 50, cumprida: false });
  });

  it("caps the percentage at 100 so the bar cannot overflow", () => {
    const dados = {
      ...vazio,
      activities: [act("m1", "call", 0, "a"), act("m1", "call", 0, "b"), act("m1", "call", 0, "c")],
    };
    const p = progressoMeta(makeMeta({ alvo: 1 }), "m1", dados, agora);
    expect(p.realizado).toBe(3);
    expect(p.percentual).toBe(100);
    expect(p.cumprida).toBe(true);
  });

  it("treats exactly hitting the target as met", () => {
    const dados = { ...vazio, activities: [act("m1", "call", 0, "a")] };
    expect(progressoMeta(makeMeta({ alvo: 1 }), "m1", dados, agora).cumprida).toBe(true);
  });
});

describe("progressoDoMembro", () => {
  it("puts pending goals first, least advanced at the top", () => {
    const metas = [
      makeMeta({ id: "cumprida", metrica: "atividades", alvo: 1 }),
      makeMeta({ id: "meio", metrica: "atividades", alvo: 2 }),
      makeMeta({ id: "longe", metrica: "atividades", alvo: 100 }),
    ];
    const dados = { ...vazio, activities: [act("m1", "call", 0, "a")] };
    expect(progressoDoMembro(metas, "m1", dados, agora).map((p) => p.meta.id)).toEqual([
      "longe",
      "meio",
      "cumprida",
    ]);
  });

  it("returns nothing when the person has no active goals", () => {
    expect(progressoDoMembro([makeMeta({ memberId: "m2" })], "m1", vazio, agora)).toEqual([]);
  });
});
