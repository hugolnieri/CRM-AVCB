import { describe, expect, it } from "vitest";
import { anosDeAtividade, qualificar, type DadosQualificacao } from "./qualificacao";
import { makeTipoServico } from "./testFixtures";

const construcao = makeTipoServico({ id: "t1", nome: "NR-35", cnaes: ["41"] });
const altura = makeTipoServico({ id: "t2", nome: "NR-18", cnaes: ["41", "42"] });
const espaco = makeTipoServico({ id: "t3", nome: "NR-33", cnaes: ["4120"] });
const quimica = makeTipoServico({ id: "t4", nome: "NR-20", cnaes: ["20"] });
const TIPOS = [construcao, altura, espaco, quimica];

function dados(over: Partial<DadosQualificacao> = {}): DadosQualificacao {
  return {
    cnae: "4120400",
    porte: "05",
    capitalSocial: 500_000,
    matriz: true,
    inicioAtividade: "2010-05-20",
    telefone: "(15) 3284-2586",
    email: "contato@alfa.com.br",
    ...over,
  };
}

describe("qualificar", () => {
  it("scores an established construction company as high", () => {
    const q = qualificar(dados(), TIPOS);
    expect(q.nivel).toBe("alta");
    expect(q.servicos).toEqual(expect.arrayContaining(["NR-35", "NR-18", "NR-33"]));
  });

  it("scores a brand-new MEI outside our catalogue as low", () => {
    const q = qualificar(
      dados({ cnae: "9602501", porte: "01", capitalSocial: 1000, inicioAtividade: "2026-06-01" }),
      TIPOS,
    );
    expect(q.nivel).toBe("baixa");
    expect(q.servicos).toEqual([]);
  });

  // O sinal que fala do nosso negocio, e nao do tamanho da empresa.
  it("weighs how many catalogue services fit the trade", () => {
    const muitos = qualificar(dados({ cnae: "4120400" }), TIPOS);
    const um = qualificar(dados({ cnae: "2011800" }), TIPOS);
    expect(muitos.pontos).toBeGreaterThan(um.pontos);
  });

  it("gives no points for a trade the catalogue does not cover", () => {
    const q = qualificar(dados({ cnae: "6201500" }), TIPOS);
    expect(q.servicos).toEqual([]);
    expect(q.motivos.join(" ")).not.toContain("catálogo");
  });

  // Um numero opaco nao deixa ninguem discordar dele.
  it("always explains itself", () => {
    expect(qualificar(dados(), TIPOS).motivos.length).toBeGreaterThan(0);
    expect(qualificar(dados({ porte: "01", matriz: false }), TIPOS).motivos.length).toBeGreaterThan(
      0,
    );
  });

  it("says why a weak lead is weak, not just that it is", () => {
    const q = qualificar(dados({ porte: "01", matriz: false }), TIPOS);
    expect(q.motivos.join(" ")).toContain("Microempresa");
    expect(q.motivos.join(" ")).toContain("filial");
  });

  it("prefers the head office over a branch, all else equal", () => {
    expect(qualificar(dados({ matriz: true }), TIPOS).pontos).toBeGreaterThan(
      qualificar(dados({ matriz: false }), TIPOS).pontos,
    );
  });

  // A Receita deixa o porte vazio com frequencia: campo ausente nao pode
  // penalizar nem premiar, so nao pontuar.
  it("treats an unknown porte as silence, not as a penalty", () => {
    const semPorte = qualificar(dados({ porte: null }), TIPOS);
    const micro = qualificar(dados({ porte: "01" }), TIPOS);
    expect(semPorte.pontos).toBeGreaterThanOrEqual(micro.pontos);
    expect(semPorte.motivos.join(" ")).not.toContain("Micro");
  });

  it("handles a missing opening date without crashing", () => {
    expect(() => qualificar(dados({ inicioAtividade: null }), TIPOS)).not.toThrow();
  });

  it("rewards having both ways to reach the company", () => {
    expect(qualificar(dados(), TIPOS).pontos).toBeGreaterThan(
      qualificar(dados({ email: null }), TIPOS).pontos,
    );
  });
});

describe("anosDeAtividade", () => {
  const agora = new Date(2026, 6, 29); // 29/07/2026

  it("counts whole years only", () => {
    expect(anosDeAtividade("2020-07-29", agora)).toBe(6);
    expect(anosDeAtividade("2020-07-30", agora)).toBe(5);
  });

  it("returns null for a missing date", () => {
    expect(anosDeAtividade(null, agora)).toBeNull();
  });

  it("returns null for garbage instead of a negative number", () => {
    expect(anosDeAtividade("0000-00-00", agora)).toBeNull();
  });

  // new Date("2020-01-01") e lido como UTC e volta 31/12 em UTC-3.
  it("does not shift the date by timezone", () => {
    expect(anosDeAtividade("2020-01-01", new Date(2026, 0, 1))).toBe(6);
  });
});
