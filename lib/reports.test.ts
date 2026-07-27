import { describe, expect, it } from "vitest";
import { computeReports } from "./reports";
import { makeLead } from "./testFixtures";
import type { Lead, PipelineStage } from "@/types/lead";

function lead(stage: PipelineStage, origem: string, valorEstimado: number | null = null): Lead {
  return makeLead({ id: Math.random().toString(), pipelineStage: stage, origem, valorEstimado });
}

describe("computeReports", () => {
  const leads: Lead[] = [
    lead("fechado_ganho", "indicacao", 5000),
    lead("fechado_ganho", "indicacao", 3000),
    lead("fechado_perdido", "site", 1000),
    lead("novo_lead", "site", 2000),
    lead("contato_feito", "telefone", 800),
  ];
  const r = computeReports(leads);

  it("counts totals, ganhos, perdidos and em andamento", () => {
    expect(r.total).toBe(5);
    expect(r.ganhos).toBe(2);
    expect(r.perdidos).toBe(1);
    expect(r.emAndamento).toBe(2);
  });

  it("computes conversion rate as ganhos / (ganhos + perdidos)", () => {
    // 2 ganhos / (2 + 1) decididos = 67%
    expect(r.taxaConversao).toBe(67);
  });

  it("sums valorEstimado of open leads only", () => {
    // 2000 (novo_lead) + 800 (contato_feito); ganhos e perdidos ficam de fora.
    expect(r.valorEmAberto).toBe(2800);
  });

  it("ranks origens by count", () => {
    expect(r.porOrigem[0]).toEqual({ key: "indicacao", label: "indicacao", count: 2 });
  });

  it("buckets leads with no origem under 'Não informada'", () => {
    const r2 = computeReports([lead("novo_lead", null as unknown as string)]);
    expect(r2.porOrigem[0].label).toBe("Não informada");
  });

  it("handles an empty list without dividing by zero", () => {
    const empty = computeReports([]);
    expect(empty.total).toBe(0);
    expect(empty.taxaConversao).toBe(0);
    expect(empty.valorEmAberto).toBe(0);
    expect(empty.porOrigem).toEqual([]);
  });
});
