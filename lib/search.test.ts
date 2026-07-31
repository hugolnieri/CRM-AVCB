import { describe, expect, it } from "vitest";
import {
  leadMatchesQuery,
  matchesQuery,
  normalizeForSearch,
  tipoServicoMatchesQuery,
} from "./search";
import { makeLead } from "./testFixtures";

describe("normalizeForSearch", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeForSearch("João Pilon")).toBe("joao pilon");
    expect(normalizeForSearch("AÇÃO")).toBe("acao");
  });
});

describe("matchesQuery", () => {
  it("ignores null and undefined fields", () => {
    expect(matchesQuery([null, undefined, "Padaria"], "padaria")).toBe(true);
    expect(matchesQuery([null, undefined], "padaria")).toBe(false);
  });

  it("returns true for a blank or whitespace-only query", () => {
    expect(matchesQuery(["qualquer coisa"], "")).toBe(true);
    expect(matchesQuery(["qualquer coisa"], "   ")).toBe(true);
  });
});

describe("leadMatchesQuery", () => {
  it("matches by name, accent-insensitively", () => {
    expect(leadMatchesQuery(makeLead(), "joia")).toBe(true);
    expect(leadMatchesQuery(makeLead(), "JÓIA")).toBe(true);
  });

  it("matches by contact name, city, phone, CNPJ and interesse", () => {
    expect(leadMatchesQuery(makeLead(), "joao pilon")).toBe(true);
    expect(leadMatchesQuery(makeLead(), "cerquilho")).toBe(true);
    expect(leadMatchesQuery(makeLead(), "3284-2586")).toBe(true);
    expect(leadMatchesQuery(makeLead(), "12345678000199")).toBe(true);
    expect(leadMatchesQuery(makeLead(), "nr-35")).toBe(true);
  });

  it("returns true for an empty query and false for no match", () => {
    expect(leadMatchesQuery(makeLead(), "")).toBe(true);
    expect(leadMatchesQuery(makeLead(), "padaria")).toBe(false);
  });
});

describe("tipoServicoMatchesQuery", () => {
  const tipo = {
    nome: "Trabalho em Altura",
    sigla: "NR-35",
    materialVenda: "Principal objeção: 'já treinamos há anos'.",
  };

  it("matches by name and sigla, accent-insensitively", () => {
    expect(tipoServicoMatchesQuery(tipo, [], "altura")).toBe(true);
    expect(tipoServicoMatchesQuery(tipo, [], "nr-35")).toBe(true);
  });

  // Quem procura no manual lembra do assunto, não do rótulo do catálogo.
  it("reaches into the written script", () => {
    expect(tipoServicoMatchesQuery(tipo, [], "objecao")).toBe(true);
  });

  it("reaches into the attached file names", () => {
    expect(tipoServicoMatchesQuery(tipo, ["Guia Comercial.docx"], "guia")).toBe(true);
    expect(tipoServicoMatchesQuery(tipo, [], "guia")).toBe(false);
  });

  it("survives a type with no sigla or script", () => {
    const cru = { nome: "Primeiros Socorros", sigla: null, materialVenda: null };
    expect(tipoServicoMatchesQuery(cru, [], "socorros")).toBe(true);
    expect(tipoServicoMatchesQuery(cru, [], "altura")).toBe(false);
  });

  it("returns everything for an empty query", () => {
    expect(tipoServicoMatchesQuery(tipo, [], "")).toBe(true);
  });
});
