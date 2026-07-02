import { describe, expect, it } from "vitest";
import { leadMatchesQuery, normalizeForSearch } from "./search";
import type { Lead } from "@/types/lead";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "1",
    placeId: null,
    mapsUrl: "https://maps.google.com/x",
    name: "Supermercado Ki Jóia",
    category: "Supermercado",
    rating: 4.5,
    reviewCount: 10,
    phoneRaw: "(15) 3284-2586",
    phoneE164: "+551532842586",
    address: "Av. Pref. Antônio Souto, 1148, Cerquilho - SP",
    lat: null,
    lng: null,
    photoUrl: null,
    lastReviewSnippet: null,
    pipelineStage: "novo_lead",
    tipoLicenca: "AVCB",
    avcbStatus: "nao_informado",
    avcbValidade: null,
    assignedUserId: null,
    cnpj: "12345678000199",
    receitaData: null,
    enderecoDetalhado: null,
    bombeirosConsulta: null,
    position: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("normalizeForSearch", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeForSearch("João Pilon")).toBe("joao pilon");
    expect(normalizeForSearch("AÇÃO")).toBe("acao");
  });
});

describe("leadMatchesQuery", () => {
  it("matches by name, accent-insensitively", () => {
    expect(leadMatchesQuery(makeLead(), "joia")).toBe(true);
    expect(leadMatchesQuery(makeLead(), "JÓIA")).toBe(true);
  });

  it("matches by city embedded in the address", () => {
    expect(leadMatchesQuery(makeLead(), "cerquilho")).toBe(true);
  });

  it("matches by category, phone, and CNPJ", () => {
    expect(leadMatchesQuery(makeLead(), "supermercado")).toBe(true);
    expect(leadMatchesQuery(makeLead(), "3284-2586")).toBe(true);
    expect(leadMatchesQuery(makeLead(), "12345678000199")).toBe(true);
  });

  it("matches by enriched Receita data when present", () => {
    const lead = makeLead({
      receitaData: {
        razaoSocial: "Comercial Ki Joia Ltda",
        nomeFantasia: null,
        cnae: "Comércio varejista",
        situacaoCadastral: "ATIVA",
        dataInicioAtividade: null,
        telefone: null,
        email: null,
        endereco: null,
        consultadoEm: "2026-01-01T00:00:00Z",
      },
    });
    expect(leadMatchesQuery(lead, "comercial ki joia")).toBe(true);
  });

  it("returns true for an empty query and false for no match", () => {
    expect(leadMatchesQuery(makeLead(), "")).toBe(true);
    expect(leadMatchesQuery(makeLead(), "padaria")).toBe(false);
  });
});
