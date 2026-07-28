import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { computeRelatorioDiario, totaisRelatorio } from "./relatorioDiario";
import { makeServico } from "./testFixtures";
import type { Activity, ActivityType } from "@/types/activity";
import type { RegistroDiario } from "@/types/jornada";
import type { TeamMember } from "@/types/team";

const agora = dayjs("2026-07-27T18:00:00");
const dia = (n: number) => agora.subtract(n, "day").format("YYYY-MM-DD");

const membros: TeamMember[] = [
  { id: "m1", fullName: "Ana", email: "a@x.com", role: "colaborador", ativo: true, createdAt: "" },
  { id: "m2", fullName: "Bruno", email: "b@x.com", role: "admin", ativo: true, createdAt: "" },
];

function act(authorId: string, tipo: ActivityType, quandoDia: number): Activity {
  return {
    id: Math.random().toString(),
    leadId: "l1",
    clienteId: null,
    authorId,
    activityType: tipo,
    body: null,
    metadata: null,
    createdAt: agora.subtract(quandoDia, "day").toISOString(),
  };
}

function registro(memberId: string, quandoDia: number, over: Partial<RegistroDiario> = {}): RegistroDiario {
  const data = dia(quandoDia);
  return {
    id: Math.random().toString(),
    memberId,
    data,
    inicioAt: `${data}T09:00:00.000Z`,
    fimAt: `${data}T18:00:00.000Z`,
    observacoes: null,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

const vazio = { membros, registros: [], activities: [], servicos: [] };

describe("computeRelatorioDiario", () => {
  it("returns nothing when there was no activity at all", () => {
    expect(computeRelatorioDiario(vazio, 30, agora)).toEqual([]);
  });

  it("counts contacts but not stage changes or conversions as contacts", () => {
    const linhas = computeRelatorioDiario(
      {
        ...vazio,
        activities: [
          act("m1", "call", 0),
          act("m1", "whatsapp", 0),
          act("m1", "visit", 0),
          act("m1", "note", 0),
          act("m1", "follow_up", 0),
          act("m1", "stage_change", 0),
          act("m1", "converted", 0),
        ],
      },
      30,
      agora,
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0].contatos).toBe(5);
    expect(linhas[0].fechamentos).toBe(1);
  });

  it("computes hours worked from the journey record", () => {
    const linhas = computeRelatorioDiario({ ...vazio, registros: [registro("m1", 0)] }, 30, agora);
    expect(linhas[0].horas).toBe(9);
  });

  it("leaves hours null when the day was never closed", () => {
    const linhas = computeRelatorioDiario(
      { ...vazio, registros: [registro("m1", 0, { fimAt: null })] },
      30,
      agora,
    );
    expect(linhas[0].horas).toBeNull();
  });

  it("attributes services to whoever is responsible, on the date performed", () => {
    const linhas = computeRelatorioDiario(
      {
        ...vazio,
        servicos: [
          makeServico({ id: "s1", responsavelId: "m2", dataRealizacao: dia(1) }),
          // Sem responsável não dá para atribuir a ninguém.
          makeServico({ id: "s2", responsavelId: null, dataRealizacao: dia(1) }),
          // Agendado ainda não foi feito.
          makeServico({
            id: "s3",
            responsavelId: "m2",
            status: "agendado",
            dataRealizacao: null,
            dataAgendada: agora.toISOString(),
          }),
        ],
      },
      30,
      agora,
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ memberId: "m2", servicosRealizados: 1 });
  });

  it("keeps one line per person per day", () => {
    const linhas = computeRelatorioDiario(
      {
        ...vazio,
        registros: [registro("m1", 0), registro("m2", 0)],
        activities: [act("m1", "call", 0), act("m1", "call", 1)],
      },
      30,
      agora,
    );
    // m1 hoje, m2 hoje, m1 ontem (só atividade, sem jornada).
    expect(linhas).toHaveLength(3);
    expect(new Set(linhas.map((l) => `${l.memberId}|${l.data}`)).size).toBe(3);
  });

  it("sorts by most recent day first, then by name", () => {
    const linhas = computeRelatorioDiario(
      { ...vazio, registros: [registro("m2", 0), registro("m1", 0), registro("m1", 3)] },
      30,
      agora,
    );
    expect(linhas.map((l) => `${l.data}|${l.nome}`)).toEqual([
      `${dia(0)}|Ana`,
      `${dia(0)}|Bruno`,
      `${dia(3)}|Ana`,
    ]);
  });

  it("respects the lookback window", () => {
    const linhas = computeRelatorioDiario(
      { ...vazio, registros: [registro("m1", 0), registro("m1", 60)] },
      30,
      agora,
    );
    expect(linhas).toHaveLength(1);
  });

  it("labels a removed user instead of crashing", () => {
    const linhas = computeRelatorioDiario(
      { ...vazio, registros: [registro("fantasma", 0)] },
      30,
      agora,
    );
    expect(linhas[0].nome).toBe("Usuário removido");
  });
});

describe("totaisRelatorio", () => {
  it("sums the period and counts only days actually started", () => {
    const linhas = computeRelatorioDiario(
      {
        ...vazio,
        registros: [registro("m1", 0), registro("m2", 0, { inicioAt: null })],
        activities: [act("m1", "call", 0), act("m2", "converted", 0)],
      },
      30,
      agora,
    );
    const t = totaisRelatorio(linhas);
    expect(t.contatos).toBe(1);
    expect(t.fechamentos).toBe(1);
    expect(t.diasTrabalhados).toBe(1);
  });

  it("handles an empty period", () => {
    expect(totaisRelatorio([])).toEqual({
      contatos: 0,
      fechamentos: 0,
      servicosRealizados: 0,
      diasTrabalhados: 0,
    });
  });
});
