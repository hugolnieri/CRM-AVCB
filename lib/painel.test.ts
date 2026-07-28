import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { computePainel } from "./painel";
import { makeCliente, makeLead, makeServico, makeTipoServico } from "./testFixtures";

const now = dayjs("2026-07-27T10:00:00");
const em = (dias: number) => now.add(dias, "day").format("YYYY-MM-DD");

const vazio = { clientes: [], servicos: [], tipos: [], leads: [] };

describe("computePainel", () => {
  it("handles empty input", () => {
    const r = computePainel(vazio, now);
    expect(r.clientesAtivos).toBe(0);
    expect(r.servicosRealizados).toBe(0);
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
        servicos: [
          makeServico({ id: "s1", clienteId: "c1", dataVencimento: em(200) }),
          makeServico({ id: "s2", clienteId: "c2", dataVencimento: em(200) }),
        ],
      },
      now,
    );
    expect(r.clientesAtivos).toBe(1);
    expect(r.servicosRealizados).toBe(2);
  });

  it("separates realizado from agendado in the counters", () => {
    const r = computePainel(
      {
        ...vazio,
        clientes: [makeCliente({ id: "c1" })],
        servicos: [
          makeServico({ id: "s1", clienteId: "c1", dataVencimento: em(200) }),
          makeServico({
            id: "s2",
            clienteId: "c1",
            status: "agendado",
            dataAgendada: now.add(3, "day").toISOString(),
            dataRealizacao: null,
            dataVencimento: null,
          }),
        ],
      },
      now,
    );
    expect(r.servicosRealizados).toBe(1);
    expect(r.servicosAgendados).toBe(1);
  });

  it("separates already-expired from upcoming", () => {
    const r = computePainel(
      {
        ...vazio,
        clientes: [makeCliente({ id: "c1" })],
        servicos: [
          makeServico({ id: "s1", clienteId: "c1", dataVencimento: em(-3) }),
          makeServico({ id: "s2", clienteId: "c1", dataVencimento: em(5) }),
          makeServico({ id: "s3", clienteId: "c1", dataVencimento: em(20) }),
          makeServico({ id: "s4", clienteId: "c1", dataVencimento: em(200) }),
        ],
      },
      now,
    );
    expect(r.vencidos).toBe(1);
    // esta_semana + este_mes; o de 200 dias fica em "futuro" e não conta.
    expect(r.proximosVencimentos).toBe(2);
  });
});

describe("pendências", () => {
  const tipoComValidade = makeTipoServico({ id: "tipo-1", validadeMeses: 24 });
  const tipoSemValidade = makeTipoServico({ id: "tipo-2", validadeMeses: null });

  const tipos = (painel: ReturnType<typeof computePainel>) =>
    painel.pendencias.map((p) => p.tipo);

  it("flags an expired item", () => {
    const r = computePainel(
      {
        ...vazio,
        clientes: [makeCliente({ id: "c1" })],
        servicos: [makeServico({ clienteId: "c1", dataVencimento: em(-1) })],
      },
      now,
    );
    expect(tipos(r)).toContain("vencido");
  });

  // Sem isto o agendamento vira buraco silencioso: some da agenda sem virar nada.
  it("flags a scheduled service whose date passed without being completed", () => {
    const r = computePainel(
      {
        ...vazio,
        clientes: [makeCliente({ id: "c1" })],
        servicos: [
          makeServico({
            clienteId: "c1",
            status: "agendado",
            dataAgendada: now.subtract(2, "day").toISOString(),
            dataRealizacao: null,
            dataVencimento: null,
          }),
        ],
      },
      now,
    );
    expect(tipos(r)).toContain("agendado_atrasado");
  });

  it("does not flag a scheduled service still in the future", () => {
    const r = computePainel(
      {
        ...vazio,
        clientes: [makeCliente({ id: "c1" })],
        servicos: [
          makeServico({
            clienteId: "c1",
            status: "agendado",
            dataAgendada: now.add(2, "day").toISOString(),
            dataRealizacao: null,
            dataVencimento: null,
          }),
        ],
      },
      now,
    );
    expect(tipos(r)).not.toContain("agendado_atrasado");
  });

  it("flags a won lead that never became a cliente, and stops once it has", () => {
    const leads = [makeLead({ id: "lead-9", pipelineStage: "fechado_ganho" })];
    expect(tipos(computePainel({ ...vazio, leads }, now))).toContain("conversao_pendente");

    const comCliente = computePainel(
      {
        ...vazio,
        leads,
        clientes: [makeCliente({ id: "c1", leadId: "lead-9" })],
        servicos: [makeServico({ clienteId: "c1", dataVencimento: em(200) })],
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

  it("flags an active cliente with no service at all", () => {
    const r = computePainel({ ...vazio, clientes: [makeCliente({ id: "c1" })] }, now);
    expect(tipos(r)).toContain("cliente_sem_servico");
  });

  it("does not flag inactive clientes for missing service", () => {
    const r = computePainel(
      { ...vazio, clientes: [makeCliente({ id: "c1", status: "inativo" })] },
      now,
    );
    expect(tipos(r)).not.toContain("cliente_sem_servico");
  });

  it("flags a missing due date only when the type actually has a validity", () => {
    const comum = { clientes: [makeCliente({ id: "c1" })] };

    const incompleto = computePainel(
      {
        ...vazio,
        ...comum,
        tipos: [tipoComValidade],
        servicos: [
          makeServico({ clienteId: "c1", tipoServicoId: "tipo-1", dataVencimento: null }),
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
        servicos: [
          makeServico({ clienteId: "c1", tipoServicoId: "tipo-2", dataVencimento: null }),
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
        servicos: [makeServico({ id: "s1", clienteId: "c1", dataVencimento: em(-1) })],
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
