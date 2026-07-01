import { describe, expect, it } from "vitest";
import { computeReports } from "./reports";
import type { Lead, PipelineStage, AvcbStatus } from "@/types/lead";

function makeLead(stage: PipelineStage, avcb: AvcbStatus, category: string): Lead {
  return {
    id: Math.random().toString(),
    placeId: null,
    mapsUrl: "x",
    name: "Lead",
    category,
    rating: null,
    reviewCount: null,
    phoneRaw: null,
    phoneE164: null,
    address: null,
    lat: null,
    lng: null,
    photoUrl: null,
    lastReviewSnippet: null,
    pipelineStage: stage,
    tipoLicenca: "AVCB",
    avcbStatus: avcb,
    avcbValidade: null,
    assignedUserId: null,
    cnpj: null,
    receitaData: null,
    position: 0,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

describe("computeReports", () => {
  const leads: Lead[] = [
    makeLead("fechado_ganho", "em_dia", "Supermercado"),
    makeLead("fechado_ganho", "vencido", "Supermercado"),
    makeLead("fechado_perdido", "vencido", "Loja de ferramentas"),
    makeLead("novo_lead", "nao_informado", "Padaria"),
    makeLead("contato_feito", "vencido", "Padaria"),
  ];
  const r = computeReports(leads);

  it("counts totals, clientes, perdidos and em andamento", () => {
    expect(r.total).toBe(5);
    expect(r.clientes).toBe(2);
    expect(r.perdidos).toBe(1);
    expect(r.emAndamento).toBe(2);
  });

  it("counts AVCB vencidos", () => {
    expect(r.avcbVencidos).toBe(3);
  });

  it("computes conversion rate as ganhos / (ganhos + perdidos)", () => {
    // 2 ganhos / (2 + 1) decididos = 67%
    expect(r.taxaConversao).toBe(67);
  });

  it("ranks categories by count", () => {
    expect(r.porCategoria[0]).toEqual({ key: "Supermercado", label: "Supermercado", count: 2 });
  });

  it("handles an empty list without dividing by zero", () => {
    const empty = computeReports([]);
    expect(empty.total).toBe(0);
    expect(empty.taxaConversao).toBe(0);
  });
});
