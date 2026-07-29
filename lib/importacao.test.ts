import { describe, expect, it } from "vitest";
import {
  avaliarImportacao,
  importaveis,
  ORIGEM_IMPORTACAO,
  paraLeadInput,
  resumir,
  type ArquivoProspeccao,
  type RegistroReceita,
} from "./importacao";
import { makeCliente, makeLead, makeTipoServico } from "./testFixtures";

function reg(over: Partial<RegistroReceita> = {}): RegistroReceita {
  return {
    cnpj: "00000000000191",
    razaoSocial: "CONSTRUTORA ALFA LTDA",
    nomeFantasia: "Alfa Construções",
    matriz: true,
    cnae: "4120400",
    endereco: "Rua das Obras 100",
    bairro: "Centro",
    cep: "18520000",
    cidade: "Cerquilho",
    uf: "SP",
    telefone: "(15) 3284-2586",
    email: "contato@alfa.com.br",
    porte: "Demais",
    capitalSocial: 500000,
    ...over,
  };
}

function arquivo(registros: RegistroReceita[]): ArquivoProspeccao {
  return {
    geradoEm: "2026-07-29T00:00:00Z",
    camadas: ["vizinhas"],
    cnaes: ["41"],
    total: registros.length,
    registros,
  };
}

const nr35 = makeTipoServico({ id: "nr35", nome: "NR-35", cnaes: ["41"] });
const nr33 = makeTipoServico({ id: "nr33", nome: "NR-33", cnaes: ["10"] });
const vazio = { leads: [], clientes: [], tipos: [nr35, nr33] };

describe("avaliarImportacao", () => {
  it("lets a fresh company through and attaches the suggested services", () => {
    const [c] = avaliarImportacao(arquivo([reg()]), vazio);
    expect(c.descarte).toBeNull();
    expect(c.servicosSugeridos).toEqual(["NR-35"]);
    expect(c.segmento).toBe("Construção de Edifícios");
  });

  // O erro que só aparece semanas depois: alguém liga oferecendo o que a
  // empresa já comprou.
  it("blocks a CNPJ that is already a client", () => {
    const existentes = { ...vazio, clientes: [makeCliente({ cnpj: "00.000.000/0001-91" })] };
    const [c] = avaliarImportacao(arquivo([reg()]), existentes);
    expect(c.descarte).toBe("ja_e_cliente");
  });

  it("blocks a CNPJ already in the funnel, however it was punctuated", () => {
    const existentes = { ...vazio, leads: [makeLead({ cnpj: "00.000.000/0001-91" })] };
    const [c] = avaliarImportacao(arquivo([reg()]), existentes);
    expect(c.descarte).toBe("ja_e_lead");
  });

  it("prefers the client verdict over the lead one", () => {
    const existentes = {
      ...vazio,
      leads: [makeLead({ cnpj: "00000000000191" })],
      clientes: [makeCliente({ cnpj: "00000000000191" })],
    };
    expect(avaliarImportacao(arquivo([reg()]), existentes)[0].descarte).toBe("ja_e_cliente");
  });

  // O cadastro manual exige telefone ou e-mail; importar sem os dois criaria um
  // registro que o proprio formulario do sistema recusaria.
  it("blocks a company with no way to reach it", () => {
    const [c] = avaliarImportacao(arquivo([reg({ telefone: null, email: null })]), vazio);
    expect(c.descarte).toBe("sem_contato");
  });

  it("accepts a company with only one of the two", () => {
    expect(avaliarImportacao(arquivo([reg({ email: null })]), vazio)[0].descarte).toBeNull();
    expect(avaliarImportacao(arquivo([reg({ telefone: null })]), vazio)[0].descarte).toBeNull();
  });

  it("blocks a malformed CNPJ", () => {
    const [c] = avaliarImportacao(arquivo([reg({ cnpj: "123" })]), vazio);
    expect(c.descarte).toBe("cnpj_invalido");
  });

  // Sumir com 300 de 1.200 linhas deixaria quem importa sem saber se o filtro
  // funcionou ou se o arquivo estava errado.
  it("keeps the discarded rows in the list instead of dropping them", () => {
    const r = avaliarImportacao(arquivo([reg(), reg({ cnpj: "123" })]), vazio);
    expect(r).toHaveLength(2);
    expect(importaveis(r)).toHaveLength(1);
  });

  it("leaves the suggestion empty when the catalogue has no rule for that CNAE", () => {
    const [c] = avaliarImportacao(arquivo([reg({ cnae: "6201500" })]), vazio);
    expect(c.servicosSugeridos).toEqual([]);
    expect(c.descarte).toBeNull();
  });
});

describe("paraLeadInput", () => {
  it("maps the record onto a lead, carrying the suggestions over", () => {
    const [c] = avaliarImportacao(arquivo([reg()]), vazio);
    const input = paraLeadInput(c, "m1");

    expect(input).toMatchObject({
      name: "Alfa Construções",
      cnpj: "00000000000191",
      cnae: "4120400",
      cnaeDescricao: "Construção de Edifícios",
      cidade: "Cerquilho",
      uf: "SP",
      origem: ORIGEM_IMPORTACAO,
      possiveisServicos: ["NR-35"],
      assignedUserId: "m1",
      pipelineStage: "novo_lead",
    });
  });

  it("falls back to the legal name when there is no trade name", () => {
    const [c] = avaliarImportacao(arquivo([reg({ nomeFantasia: null })]), vazio);
    expect(paraLeadInput(c, null).name).toBe("CONSTRUTORA ALFA LTDA");
  });

  // Inventar "Responsável" seria pior que deixar vazio: o campo e obrigatorio
  // no cadastro manual justamente para forcar alguem a descobrir o nome.
  it("never invents a contact name", () => {
    const [c] = avaliarImportacao(arquivo([reg()]), vazio);
    expect(paraLeadInput(c, null).contatoNome).toBeNull();
  });

  it("derives E.164 from the phone the Receita gave", () => {
    const [c] = avaliarImportacao(arquivo([reg()]), vazio);
    expect(paraLeadInput(c, null).phoneE164).toBe("+551532842586");
  });

  it("joins street and neighbourhood into one address line", () => {
    const [c] = avaliarImportacao(arquivo([reg()]), vazio);
    expect(paraLeadInput(c, null).address).toBe("Rua das Obras 100 - Centro");
  });
});

describe("resumir", () => {
  it("counts what goes in, what is blocked and why", () => {
    const existentes = { ...vazio, clientes: [makeCliente({ cnpj: "11222333000181" })] };
    const r = avaliarImportacao(
      arquivo([
        reg({ cnpj: "00000000000191" }),
        reg({ cnpj: "11222333000181" }),
        reg({ cnpj: "33000167000101", telefone: null, email: null }),
        reg({ cnpj: "xx" }),
      ]),
      existentes,
    );

    expect(resumir(r)).toMatchObject({
      total: 4,
      importaveis: 1,
      porMotivo: { ja_e_cliente: 1, sem_contato: 1, cnpj_invalido: 1, ja_e_lead: 0 },
      comSugestao: 1,
    });
  });

  it("reports zero suggestions when the catalogue covers nothing", () => {
    const r = avaliarImportacao(arquivo([reg({ cnae: "6201500" })]), vazio);
    expect(resumir(r).comSugestao).toBe(0);
  });
});
