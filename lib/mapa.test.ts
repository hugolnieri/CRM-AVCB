import { describe, expect, it } from "vitest";
import { agruparPorCidade, chaveCidade, enquadrar, raioDaBolha } from "./mapa";
import { makeLead } from "./testFixtures";

describe("chaveCidade", () => {
  it("treats different spellings of the same city as one", () => {
    expect(chaveCidade("São Paulo", "SP")).toBe(chaveCidade("sao paulo", "sp"));
    expect(chaveCidade("  Sorocaba  ", "SP")).toBe(chaveCidade("Sorocaba", "SP"));
  });

  it("keeps same-named cities in different states apart", () => {
    expect(chaveCidade("Campo Grande", "MS")).not.toBe(chaveCidade("Campo Grande", "RJ"));
  });
});

describe("agruparPorCidade", () => {
  it("groups by normalized city and sums count and value", () => {
    const { grupos } = agruparPorCidade([
      makeLead({ id: "a", cidade: "Sorocaba", uf: "SP", valorEstimado: 5000 }),
      makeLead({ id: "b", cidade: "sorocaba", uf: "sp", valorEstimado: 3000 }),
      makeLead({ id: "c", cidade: "Itu", uf: "SP", valorEstimado: null }),
    ]);

    expect(grupos).toHaveLength(2);
    expect(grupos[0]).toMatchObject({ total: 2, valor: 8000 });
    // O nome mostrado é a primeira grafia vista, não a normalizada.
    expect(grupos[0].nome).toBe("Sorocaba");
    expect(grupos[1]).toMatchObject({ nome: "Itu", total: 1, valor: 0 });
  });

  it("sorts by count, biggest first", () => {
    const { grupos } = agruparPorCidade([
      makeLead({ id: "a", cidade: "Itu" }),
      makeLead({ id: "b", cidade: "Sorocaba" }),
      makeLead({ id: "c", cidade: "Sorocaba" }),
    ]);
    expect(grupos.map((g) => g.nome)).toEqual(["Sorocaba", "Itu"]);
  });

  it("sets aside leads with no city instead of dropping them", () => {
    const { grupos, semCidade } = agruparPorCidade([
      makeLead({ id: "a", cidade: "Itu" }),
      makeLead({ id: "b", cidade: null }),
      makeLead({ id: "c", cidade: "   " }),
    ]);
    expect(grupos).toHaveLength(1);
    expect(semCidade.map((l) => l.id)).toEqual(["b", "c"]);
  });

  it("colors the bubble by the most advanced stage in the city", () => {
    const { grupos } = agruparPorCidade([
      makeLead({ id: "a", cidade: "Itu", pipelineStage: "novo_lead" }),
      makeLead({ id: "b", cidade: "Itu", pipelineStage: "proposta_enviada" }),
      makeLead({ id: "c", cidade: "Itu", pipelineStage: "contato_feito" }),
    ]);
    expect(grupos[0].etapaPredominante).toBe("proposta_enviada");
  });
});

describe("raioDaBolha", () => {
  // Área, não raio: quatro leads ocupam quatro vezes a área de um, o que dá
  // dois vezes o raio — não quatro.
  it("scales by area, so 4x the leads is 2x the radius", () => {
    const min = 0;
    const max = 100;
    expect(raioDaBolha(1, 4, min, max)).toBe(50);
    expect(raioDaBolha(4, 4, min, max)).toBe(100);
  });

  it("never returns less than the minimum", () => {
    expect(raioDaBolha(0, 0)).toBe(8);
    expect(raioDaBolha(1, 100)).toBeGreaterThanOrEqual(8);
  });
});

describe("enquadrar", () => {
  it("falls back to the operating region when nothing is geocoded", () => {
    expect(enquadrar([])).toEqual({ centro: [-23.5, -47.45], zoom: 8 });
  });

  it("centers on the single point and zooms in", () => {
    const r = enquadrar([{ lat: -23.5, lng: -47.45 }]);
    expect(r.centro).toEqual([-23.5, -47.45]);
    expect(r.zoom).toBe(11);
  });

  it("centers on the middle of the bounding box", () => {
    const r = enquadrar([
      { lat: -23, lng: -47 },
      { lat: -24, lng: -48 },
    ]);
    expect(r.centro).toEqual([-23.5, -47.5]);
  });

  it("zooms out as the points spread", () => {
    const perto = enquadrar([
      { lat: -23.4, lng: -47.4 },
      { lat: -23.5, lng: -47.5 },
    ]);
    const longe = enquadrar([
      { lat: -5, lng: -40 },
      { lat: -30, lng: -55 },
    ]);
    expect(longe.zoom).toBeLessThan(perto.zoom);
  });
});
