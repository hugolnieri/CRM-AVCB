import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  agruparPorBucket,
  itensVenciveis,
  situacaoCliente,
  vencimentoBucket,
} from "./vencimentos";
import { makeCliente, makeServico, makeTreinamento } from "./testFixtures";

const now = dayjs("2026-07-27T10:00:00");
const em = (dias: number) => now.add(dias, "day").format("YYYY-MM-DD");

describe("vencimentoBucket", () => {
  // O invariante herdado de followUpBucket: o dia do vencimento ainda vale.
  it("never counts today as already expired", () => {
    expect(vencimentoBucket(now.format("YYYY-MM-DD"), now)).toBe("esta_semana");
    // Mesmo com o "agora" no fim do dia.
    expect(vencimentoBucket(now.format("YYYY-MM-DD"), now.endOf("day"))).toBe("esta_semana");
  });

  it("counts yesterday and earlier as expired", () => {
    expect(vencimentoBucket(em(-1), now)).toBe("vencido");
    expect(vencimentoBucket(em(-400), now)).toBe("vencido");
  });

  it("splits the future into 7-day, 30-day and beyond windows", () => {
    expect(vencimentoBucket(em(1), now)).toBe("esta_semana");
    expect(vencimentoBucket(em(6), now)).toBe("esta_semana");
    expect(vencimentoBucket(em(8), now)).toBe("este_mes");
    expect(vencimentoBucket(em(29), now)).toBe("este_mes");
    expect(vencimentoBucket(em(31), now)).toBe("futuro");
  });
});

describe("itensVenciveis", () => {
  const clientes = [makeCliente({ id: "c1", nomeFantasia: "Ki Jóia" })];

  it("merges trainings and services, sorted by date, most urgent first", () => {
    const itens = itensVenciveis(
      [makeTreinamento({ id: "t1", clienteId: "c1", dataVencimento: em(20), tipoNome: "NR-35" })],
      [makeServico({ id: "s1", clienteId: "c1", dataProxima: em(3), tipo: "Manutenção extintores" })],
      clientes,
    );

    expect(itens.map((i) => i.id)).toEqual(["s1", "t1"]);
    expect(itens[0]).toMatchObject({
      origem: "servico",
      clienteNome: "Ki Jóia",
      descricao: "Manutenção extintores",
    });
    expect(itens[1].origem).toBe("treinamento");
  });

  it("excludes records that do not expire", () => {
    const itens = itensVenciveis(
      [makeTreinamento({ clienteId: "c1", dataVencimento: null })],
      [makeServico({ clienteId: "c1", dataProxima: null })],
      clientes,
    );
    expect(itens).toEqual([]);
  });
});

describe("agruparPorBucket", () => {
  it("always returns all four buckets, even when empty", () => {
    const grupos = agruparPorBucket([], now);
    expect(Object.keys(grupos).sort()).toEqual(
      ["esta_semana", "este_mes", "futuro", "vencido"].sort(),
    );
    expect(grupos.vencido).toEqual([]);
  });

  it("places each item in its bucket", () => {
    const itens = itensVenciveis(
      [
        makeTreinamento({ id: "atrasado", clienteId: "c1", dataVencimento: em(-5) }),
        makeTreinamento({ id: "logo", clienteId: "c1", dataVencimento: em(3) }),
        makeTreinamento({ id: "mes", clienteId: "c1", dataVencimento: em(15) }),
      ],
      [],
      [makeCliente({ id: "c1" })],
    );
    const grupos = agruparPorBucket(itens, now);

    expect(grupos.vencido.map((i) => i.id)).toEqual(["atrasado"]);
    expect(grupos.esta_semana.map((i) => i.id)).toEqual(["logo"]);
    expect(grupos.este_mes.map((i) => i.id)).toEqual(["mes"]);
  });
});

describe("situacaoCliente", () => {
  const clientes = [makeCliente({ id: "c1" })];
  const situacao = (dias: number[]) =>
    situacaoCliente(
      "c1",
      itensVenciveis(
        dias.map((d, i) =>
          makeTreinamento({ id: `t${i}`, clienteId: "c1", dataVencimento: em(d) }),
        ),
        [],
        clientes,
      ),
      now,
    );

  it("reports sem_registros for a client with nothing that expires", () => {
    expect(situacaoCliente("c1", [], now)).toBe("sem_registros");
  });

  it("reports the worst state across all of the client's records", () => {
    expect(situacao([-1, 200])).toBe("vencido");
    expect(situacao([15, 200])).toBe("a_vencer");
    expect(situacao([200, 400])).toBe("em_dia");
  });

  it("ignores other clients' records", () => {
    const itens = itensVenciveis(
      [makeTreinamento({ clienteId: "c2", dataVencimento: em(-10) })],
      [],
      [makeCliente({ id: "c1" }), makeCliente({ id: "c2" })],
    );
    expect(situacaoCliente("c1", itens, now)).toBe("sem_registros");
  });
});
