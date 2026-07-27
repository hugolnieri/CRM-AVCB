import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { computePainel } from "./painel";
import {
  makeCliente,
  makeLead,
  makeServico,
  makeTipoTreinamento,
  makeTreinamento,
} from "./testFixtures";

const now = dayjs("2026-07-27T10:00:00");
const em = (dias: number) => now.add(dias, "day").format("YYYY-MM-DD");

const vazio = { clientes: [], treinamentos: [], servicos: [], tipos: [], leads: [] };

describe("computePainel", () => {
  it("handles empty input", () => {
    const r = computePainel(vazio, now);
    expect(r.clientesAtivos).toBe(0);
    expect(r.treinamentosRealizados).toBe(0);
    expect(r.proximosVencimentos).toBe(0);
    expect(r.pendencias).toEqual([]);
  });

  it("counts only active clients", () => {
    const r = computePainel(
      {
        ...vazio,
        clientes: [
          makeCliente({ id: "c1", status: "ativo" }),
          makeCliente({ id: "c2", status: "inativo" }),
        ],
        // Treinamentos para os dois, senão viram pendência e poluem o teste.
        treinamentos: [
          makeTreinamento({ id: "t1", clienteId: "c1", dataVencimento: em(200) }),
          makeTreinamento({ id: "t2", clienteId: "c2", dataVencimento: em(200) }),
        ],
      },
      now,
    );
    expect(r.clientesAtivos).toBe(1);
    expect(r.treinamentosRealizados).toBe(2);
  });

  it("separates already-expired from upcoming", () => {
    const r = computePainel(
      {
        ...vazio,
        clientes: [makeCliente({ id: "c1" })],
        treinamentos: [
          makeTreinamento({ id: "t1", clienteId: "c1", dataVencimento: em(-3) }),
          makeTreinamento({ id: "t2", clienteId: "c1", dataVencimento: em(5) }),
          makeTreinamento({ id: "t3", clienteId: "c1", dataVencimento: em(20) }),
          makeTreinamento({ id: "t4", clienteId: "c1", dataVencimento: em(200) }),
        ],
      },
      now,
    );
    expect(r.vencidos).toBe(1);
    // esta_semana + este_mes; o de 200 dias fica em "futuro" e não conta.
    expect(r.proximosVencimentos).toBe(2);
  });

  it("counts a service's next date alongside trainings", () => {
    const r = computePainel(
      {
        ...vazio,
        clientes: [makeCliente({ id: "c1" })],
        treinamentos: [makeTreinamento({ clienteId: "c1", dataVencimento: em(200) })],
        servicos: [makeServico({ clienteId: "c1", dataProxima: em(4) })],
      },
      now,
    );
    expect(r.servicosRealizados).toBe(1);
    expect(r.proximosVencimentos).toBe(1);
  });
});

describe("pendências", () => {
  const tipoComValidade = makeTipoTreinamento({ id: "tipo-1", validadeMeses: 24 });
  const tipoSemValidade = makeTipoTreinamento({ id: "tipo-2", validadeMeses: null });

  function tipos(painel: ReturnType<typeof computePainel>) {
    return painel.pendencias.map((p) => p.tipo);
  }

  it("flags an expired item", () => {
    const r = computePainel(
      {
        ...vazio,
        clientes: [makeCliente({ id: "c1" })],
        treinamentos: [makeTreinamento({ clienteId: "c1", dataVencimento: em(-1) })],
      },
      now,
    );
    expect(tipos(r)).toContain("vencido");
  });

  it("flags a won lead that never became a cliente, and stops once it has", () => {
    const leads = [makeLead({ id: "lead-9", pipelineStage: "fechado_ganho" })];
    const semCliente = computePainel({ ...vazio, leads }, now);
    expect(tipos(semCliente)).toContain("conversao_pendente");

    const comCliente = computePainel(
      {
        ...vazio,
        leads,
        clientes: [makeCliente({ id: "c1", leadId: "lead-9" })],
        treinamentos: [makeTreinamento({ clienteId: "c1", dataVencimento: em(200) })],
      },
      now,
    );
    expect(tipos(comCliente)).not.toContain("conversao_pendente");
  });

  it("does not flag leads that are still open or were lost", () => {
    const r = computePainel(
      {
        ...vazio,
        leads: [
          makeLead({ id: "a", pipelineStage: "proposta_enviada" }),
          makeLead({ id: "b", pipelineStage: "fechado_perdido" }),
        ],
      },
      now,
    );
    expect(tipos(r)).not.toContain("conversao_pendente");
  });

  it("flags an active cliente with no training at all", () => {
    const r = computePainel({ ...vazio, clientes: [makeCliente({ id: "c1" })] }, now);
    expect(tipos(r)).toContain("cliente_sem_treinamento");
  });

  it("does not flag inactive clientes for missing training", () => {
    const r = computePainel(
      { ...vazio, clientes: [makeCliente({ id: "c1", status: "inativo" })] },
      now,
    );
    expect(tipos(r)).not.toContain("cliente_sem_treinamento");
  });

  it("flags a missing due date only when the type actually has a validity", () => {
    const comum = { clientes: [makeCliente({ id: "c1" })] };

    const incompleto = computePainel(
      {
        ...vazio,
        ...comum,
        tipos: [tipoComValidade],
        treinamentos: [
          makeTreinamento({ clienteId: "c1", tipoTreinamentoId: "tipo-1", dataVencimento: null }),
        ],
      },
      now,
    );
    expect(tipos(incompleto)).toContain("vencimento_ausente");

    const naoVence = computePainel(
      {
        ...vazio,
        ...comum,
        tipos: [tipoSemValidade],
        treinamentos: [
          makeTreinamento({ clienteId: "c1", tipoTreinamentoId: "tipo-2", dataVencimento: null }),
        ],
      },
      now,
    );
    expect(tipos(naoVence)).not.toContain("vencimento_ausente");
  });

  it("gives every pendência a unique id and a destination", () => {
    const r = computePainel(
      {
        clientes: [makeCliente({ id: "c1" }), makeCliente({ id: "c2" })],
        treinamentos: [makeTreinamento({ id: "t1", clienteId: "c1", dataVencimento: em(-1) })],
        servicos: [],
        tipos: [tipoComValidade],
        leads: [makeLead({ id: "l1", pipelineStage: "fechado_ganho" })],
      },
      now,
    );
    const ids = r.pendencias.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(r.pendencias.every((p) => p.href.startsWith("/"))).toBe(true);
  });
});
