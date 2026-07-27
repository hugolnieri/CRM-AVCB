import { describe, expect, it } from "vitest";
import { clienteDoLead, leadToClienteDraft } from "./conversao";
import { makeCliente, makeLead } from "./testFixtures";

describe("leadToClienteDraft", () => {
  it("carries the contact fields over and links back to the lead", () => {
    const lead = makeLead({ id: "lead-9" });
    const draft = leadToClienteDraft(lead);

    expect(draft.razaoSocial).toBe(lead.name);
    expect(draft.cnpj).toBe(lead.cnpj);
    expect(draft.telefoneE164).toBe(lead.phoneE164);
    expect(draft.contatoNome).toBe(lead.contatoNome);
    expect(draft.cidade).toBe("Cerquilho");
    expect(draft.leadId).toBe("lead-9");
    expect(draft.status).toBe("ativo");
  });

  it("passes nulls through instead of inventing empty strings", () => {
    const draft = leadToClienteDraft(
      makeLead({ cnpj: null, phoneRaw: null, phoneE164: null, email: null, cidade: null }),
    );
    expect(draft.cnpj).toBeNull();
    expect(draft.telefone).toBeNull();
    expect(draft.email).toBeNull();
    expect(draft.cidade).toBeNull();
  });

  it("keeps the original interest as an observation, or nothing when absent", () => {
    expect(leadToClienteDraft(makeLead({ interesse: "NR-35" })).observacoes).toBe(
      "Interesse original: NR-35",
    );
    expect(leadToClienteDraft(makeLead({ interesse: null })).observacoes).toBeNull();
  });
});

describe("clienteDoLead", () => {
  it("finds the cliente converted from a given lead", () => {
    const clientes = [makeCliente({ id: "c1", leadId: null }), makeCliente({ id: "c2", leadId: "lead-9" })];
    expect(clienteDoLead(clientes, "lead-9")?.id).toBe("c2");
    expect(clienteDoLead(clientes, "lead-outro")).toBeUndefined();
  });
});
