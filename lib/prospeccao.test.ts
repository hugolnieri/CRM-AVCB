import { describe, expect, it } from "vitest";
import { ORIGEM_PROSPECCAO, prospeccaoParaLead } from "./prospeccao";
import type { Prospeccao } from "@/types/prospeccao";

function fazer(over: Partial<Prospeccao> = {}): Prospeccao {
  return {
    id: "p1",
    cnpj: "00000000000191",
    razaoSocial: "CONSTRUTORA ALFA LTDA",
    nomeFantasia: "Alfa Construções",
    matriz: true,
    cnae: "4120400",
    cnaeDescricao: "Construção de Edifícios",
    endereco: "RUA DAS OBRAS 100",
    bairro: "CENTRO",
    cep: "18520000",
    cidade: "Cerquilho",
    uf: "SP",
    telefone: "(15) 3284-2586",
    email: "contato@alfa.com.br",
    porte: "05",
    capitalSocial: 500000,
    inicioAtividade: "2010-05-20",
    competencia: "2026-07",
    virouLeadEm: null,
    leadId: null,
    descartadaEm: null,
    descartadaPor: null,
    createdAt: "2026-07-29T00:00:00Z",
    ...over,
  };
}

describe("prospeccaoParaLead", () => {
  it("carries the company over with the suggestions attached", () => {
    expect(prospeccaoParaLead(fazer(), ["NR-35", "NR-18"], "m1")).toMatchObject({
      name: "Alfa Construções",
      cnpj: "00000000000191",
      cnae: "4120400",
      cnaeDescricao: "Construção de Edifícios",
      cidade: "Cerquilho",
      uf: "SP",
      origem: ORIGEM_PROSPECCAO,
      possiveisServicos: ["NR-35", "NR-18"],
      assignedUserId: "m1",
      pipelineStage: "novo_lead",
    });
  });

  it("falls back to the legal name when there is no trade name", () => {
    expect(prospeccaoParaLead(fazer({ nomeFantasia: null }), [], null).name).toBe(
      "CONSTRUTORA ALFA LTDA",
    );
  });

  it("falls back when the trade name is only whitespace", () => {
    expect(prospeccaoParaLead(fazer({ nomeFantasia: "   " }), [], null).name).toBe(
      "CONSTRUTORA ALFA LTDA",
    );
  });

  // Inventar "Responsável" seria pior que deixar vazio: o campo e obrigatorio
  // no cadastro manual justamente para forcar alguem a descobrir o nome.
  it("never invents a contact name", () => {
    expect(prospeccaoParaLead(fazer(), [], null).contatoNome).toBeNull();
  });

  it("derives E.164 from the phone the Receita gave", () => {
    expect(prospeccaoParaLead(fazer(), [], null).phoneE164).toBe("+551532842586");
  });

  it("survives a company with no phone", () => {
    expect(prospeccaoParaLead(fazer({ telefone: null }), [], null).phoneE164).toBeNull();
  });

  it("joins street and neighbourhood into one address line", () => {
    expect(prospeccaoParaLead(fazer(), [], null).address).toBe("RUA DAS OBRAS 100 - CENTRO");
  });

  it("leaves the address null when the Receita gave neither part", () => {
    expect(prospeccaoParaLead(fazer({ endereco: null, bairro: null }), [], null).address).toBeNull();
  });

  // Coluna nula = "ninguem decidiu ainda"; array vazio significaria "decidimos
  // que nao ha nada a oferecer", que e outra coisa.
  it("uses null, not an empty array, when nothing is suggested", () => {
    expect(prospeccaoParaLead(fazer(), [], null).possiveisServicos).toBeNull();
  });
});
