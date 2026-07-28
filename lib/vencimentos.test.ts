import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  agruparPorBucket,
  clientesPorSituacao,
  itensVenciveis,
  situacaoCliente,
  vencimentoBucket,
} from "./vencimentos";
import { makeCliente, makeServico } from "./testFixtures";

const now = dayjs("2026-07-27T10:00:00");
const em = (dias: number) => now.add(dias, "day").format("YYYY-MM-DD");

describe("vencimentoBucket", () => {
  // O invariante herdado de followUpBucket: o dia do vencimento ainda vale.
  it("never counts today as already expired", () => {
    expect(vencimentoBucket(now.format("YYYY-MM-DD"), now)).toBe("esta_semana");
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

  it("sorts by date, most urgent first", () => {
    const itens = itensVenciveis(
      [
        makeServico({ id: "s1", clienteId: "c1", dataVencimento: em(20), tipoNome: "NR-35" }),
        makeServico({ id: "s2", clienteId: "c1", dataVencimento: em(3), tipoNome: "Extintores" }),
      ],
      clientes,
    );

    expect(itens.map((i) => i.id)).toEqual(["s2", "s1"]);
    expect(itens[0]).toMatchObject({ clienteNome: "Ki Jóia", descricao: "Extintores" });
  });

  it("excludes records with no expiry date", () => {
    expect(itensVenciveis([makeServico({ clienteId: "c1", dataVencimento: null })], clientes)).toEqual([]);
  });

  // Um compromisso ainda não cumprido não gerou validade nenhuma.
  it("excludes anything that is not realizado", () => {
    const agendado = makeServico({
      clienteId: "c1",
      status: "agendado",
      dataAgendada: now.toISOString(),
      dataRealizacao: null,
      dataVencimento: em(10),
    });
    const cancelado = makeServico({ clienteId: "c1", status: "cancelado", dataVencimento: em(10) });
    expect(itensVenciveis([agendado, cancelado], clientes)).toEqual([]);
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
        makeServico({ id: "atrasado", clienteId: "c1", dataVencimento: em(-5) }),
        makeServico({ id: "logo", clienteId: "c1", dataVencimento: em(3) }),
        makeServico({ id: "mes", clienteId: "c1", dataVencimento: em(15) }),
      ],
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
        dias.map((d, i) => makeServico({ id: `s${i}`, clienteId: "c1", dataVencimento: em(d) })),
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
      [makeServico({ clienteId: "c2", dataVencimento: em(-10) })],
      [makeCliente({ id: "c1" }), makeCliente({ id: "c2" })],
    );
    expect(situacaoCliente("c1", itens, now)).toBe("sem_registros");
  });
});

describe("clientesPorSituacao", () => {
  const clientes = [
    makeCliente({ id: "c1", razaoSocial: "Vencido SA" }),
    makeCliente({ id: "c2", razaoSocial: "A vencer SA" }),
    makeCliente({ id: "c3", razaoSocial: "Em dia SA" }),
    makeCliente({ id: "c4", razaoSocial: "Inativo SA", status: "inativo" }),
  ];
  const servicos = [
    makeServico({ id: "s1", clienteId: "c1", dataVencimento: em(-5) }),
    makeServico({ id: "s2", clienteId: "c2", dataVencimento: em(10) }),
    makeServico({ id: "s3", clienteId: "c3", dataVencimento: em(300) }),
    makeServico({ id: "s4", clienteId: "c4", dataVencimento: em(-99) }),
  ];
  const grupos = clientesPorSituacao(clientes, itensVenciveis(servicos, clientes), now);

  it("puts each active client in its column", () => {
    expect(grupos.vencido.map((c) => c.cliente.id)).toEqual(["c1"]);
    expect(grupos.a_vencer.map((c) => c.cliente.id)).toEqual(["c2"]);
    expect(grupos.em_dia.map((c) => c.cliente.id)).toEqual(["c3"]);
  });

  // Cliente inativo saiu da operação: poluir o quadro com ele esconde o resto.
  it("leaves inactive clients out entirely", () => {
    const todos = Object.values(grupos).flat().map((c) => c.cliente.id);
    expect(todos).not.toContain("c4");
  });

  it("orders each column by the most urgent expiry first", () => {
    const muitos = [
      makeCliente({ id: "a" }),
      makeCliente({ id: "b" }),
    ];
    const s = [
      makeServico({ id: "sa", clienteId: "a", dataVencimento: em(-2) }),
      makeServico({ id: "sb", clienteId: "b", dataVencimento: em(-40) }),
    ];
    const g = clientesPorSituacao(muitos, itensVenciveis(s, muitos), now);
    expect(g.vencido.map((c) => c.cliente.id)).toEqual(["b", "a"]);
  });

  it("lists clients with no expiring service under sem_registros", () => {
    const g = clientesPorSituacao([makeCliente({ id: "z" })], [], now);
    expect(g.sem_registros.map((c) => c.cliente.id)).toEqual(["z"]);
    expect(g.sem_registros[0].proximoVencimento).toBeNull();
  });
});
