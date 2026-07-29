import { describe, expect, it } from "vitest";
import { CAMADAS, cidadeDaRegiao, cidadesDasCamadas, TODAS_AS_CIDADES } from "./regiao";
import { CAMADAS as CAMADAS_SCRIPT } from "../scripts/regiao.mjs";

describe("camadas", () => {
  it("starts at the head office", () => {
    expect(cidadesDasCamadas(["vizinhas"])).toContain("Cerquilho");
  });

  // A "regiao imediata" do IBGE agrupa por polo economico e exclui as duas.
  // Para quem pega a estrada, divisa com a sede e o que importa.
  it("keeps Tatuí and Laranjal Paulista in the first ring", () => {
    const vizinhas = cidadesDasCamadas(["vizinhas"]);
    expect(vizinhas).toContain("Tatuí");
    expect(vizinhas).toContain("Laranjal Paulista");
  });

  it("adds up without repeating", () => {
    const soma = CAMADAS.flatMap((c) => c.cidades).length;
    expect(TODAS_AS_CIDADES).toHaveLength(new Set(TODAS_AS_CIDADES).size);
    expect(TODAS_AS_CIDADES).toHaveLength(soma);
  });

  it("grows as layers are added", () => {
    expect(cidadesDasCamadas(["vizinhas", "sorocaba"]).length).toBeGreaterThan(
      cidadesDasCamadas(["vizinhas"]).length,
    );
  });
});

describe("cidadeDaRegiao", () => {
  // A Receita escreve em caixa alta e sem acento.
  it("matches the way the Receita writes city names", () => {
    expect(cidadeDaRegiao("CESARIO LANGE", TODAS_AS_CIDADES)).toBe("Cesário Lange");
    expect(cidadeDaRegiao("TIETE", TODAS_AS_CIDADES)).toBe("Tietê");
    expect(cidadeDaRegiao("SAO ROQUE", TODAS_AS_CIDADES)).toBe("São Roque");
  });

  it("returns null for a city outside the area", () => {
    expect(cidadeDaRegiao("MANAUS", TODAS_AS_CIDADES)).toBeNull();
  });
});

/**
 * `scripts/regiao.mjs` duplica estas listas porque os scripts rodam fora do
 * bundler do Next e não importam TypeScript. A duplicação é aceitável; divergir
 * em silêncio não é — mudar uma e esquecer a outra faria a coleta buscar
 * cidades diferentes das que a interface oferece.
 */
describe("scripts/regiao.mjs", () => {
  it("mirrors lib/regiao.ts exactly", () => {
    expect(CAMADAS_SCRIPT.map((c) => ({ id: c.id, cidades: c.cidades }))).toEqual(
      CAMADAS.map((c) => ({ id: c.id, cidades: c.cidades })),
    );
  });
});
