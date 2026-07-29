import { describe, expect, it } from "vitest";
import {
  aspasFechadas,
  colunas,
  dataReceita,
  limparRazaoSocial,
  normalizar,
  telefone,
} from "../scripts/receita.mjs";

/**
 * O formato dos dados abertos do CNPJ.
 *
 * Testado a partir de `scripts/` e não de `lib/` porque o coletor roda fora do
 * bundler do Next e não importa TypeScript. Todos os casos abaixo saíram do
 * arquivo real de 2026-07 — nenhum foi inventado, e os dois primeiros blocos são
 * exatamente os erros que os dados sintéticos da versão anterior não pegaram.
 */

describe("colunas", () => {
  it("reads the ordinary quoted row", () => {
    expect(colunas('"41273589";"ALFA LTDA";"2135"', 3)).toEqual(["41273589", "ALFA LTDA", "2135"]);
  });

  // O primeiro erro que o arquivo real acusou: split(";") dava 31 colunas.
  it("keeps a semicolon that lives inside a field", () => {
    expect(colunas('"01";"COMERCIO A; B LTDA";"03"', 3)).toEqual([
      "01",
      "COMERCIO A; B LTDA",
      "03",
    ]);
  });

  it("falls back to the careful parser when the fast split disagrees", () => {
    // Sem `esperado` o rápido venceria e devolveria 2 campos.
    expect(colunas('"01";"A; B";"03"', 3)).toHaveLength(3);
  });

  it("handles an empty field", () => {
    expect(colunas('"01";"";"03"', 3)).toEqual(["01", "", "03"]);
  });

  it("handles the last field being empty, which is common", () => {
    expect(colunas('"41273589";"ALFA LTDA";""', 3)).toEqual(["41273589", "ALFA LTDA", ""]);
  });

  it("does not crash on a row that is not quoted at all", () => {
    expect(colunas("a;b;c", 3)).toEqual(["a", "b", "c"]);
  });
});

describe("aspasFechadas", () => {
  // O segundo erro do arquivo real: um registro NAO e uma linha.
  it("detects a field left open by a line break", () => {
    expect(aspasFechadas('"01";"RUA DAS FLORES')).toBe(false);
    expect(aspasFechadas('"01";"RUA DAS FLORES";"SP"')).toBe(true);
  });

  it("treats an empty string as closed", () => {
    expect(aspasFechadas("")).toBe(true);
  });
});

describe("limparRazaoSocial", () => {
  // 56,5% das razoes sociais do arquivo real terminam assim. Dado de empresa e
  // publico; CPF de pessoa fisica e outra coisa, e nao ajuda a vender nada.
  it("strips the owner's CPF that the Receita appends", () => {
    expect(limparRazaoSocial("IRENILDA OLIVEIRA SILVA 11338767810")).toBe("IRENILDA OLIVEIRA SILVA");
    expect(limparRazaoSocial("CASSIO APARECIDO LOPES 06457523803")).toBe("CASSIO APARECIDO LOPES");
  });

  // 11,9% comecam assim, e o CNPJ ja esta na sua propria coluna.
  it("strips the CNPJ básico prefix", () => {
    expect(limparRazaoSocial("41.273.592 HELIO DE JESUS PEREIRA")).toBe("HELIO DE JESUS PEREIRA");
  });

  it("keeps the person's name — the company IS the person for a MEI", () => {
    expect(limparRazaoSocial("JULIO CESAR NUNES 39611300867")).toContain("JULIO CESAR NUNES");
  });

  it("leaves an ordinary company name untouched", () => {
    expect(limparRazaoSocial("LA BRACCIA PIZZA LTDA")).toBe("LA BRACCIA PIZZA LTDA");
    expect(limparRazaoSocial("CONSTRUTORA ALFA LTDA")).toBe("CONSTRUTORA ALFA LTDA");
  });

  // Um numero de porta não é um CPF: só 11 dígitos exatos no fim contam.
  it("does not eat a legitimate trailing number", () => {
    expect(limparRazaoSocial("TRANSPORTES 2001 LTDA")).toBe("TRANSPORTES 2001 LTDA");
    expect(limparRazaoSocial("EMPRESA 1234567890 LTDA")).toBe("EMPRESA 1234567890 LTDA");
  });

  it("survives null and empty", () => {
    expect(limparRazaoSocial(null)).toBe("");
    expect(limparRazaoSocial("")).toBe("");
  });
});

describe("normalizar", () => {
  // A Receita escreve em caixa alta e sem acento.
  it("meets the Receita halfway", () => {
    expect(normalizar("Cesário Lange")).toBe("CESARIO LANGE");
    expect(normalizar("CESARIO LANGE")).toBe("CESARIO LANGE");
    expect(normalizar("Tietê")).toBe("TIETE");
  });

  it("collapses punctuation, so hyphenated names still match", () => {
    expect(normalizar("GUAJARA-MIRIM")).toBe(normalizar("Guajará Mirim"));
  });
});

describe("dataReceita", () => {
  it("converts the Receita's date to an ISO day", () => {
    expect(dataReceita("20250710")).toBe("2025-07-10");
  });

  // "0" e "00000000" aparecem e significam vazio.
  it("returns null for the placeholders the Receita uses for empty", () => {
    expect(dataReceita("0")).toBeNull();
    expect(dataReceita("00000000")).toBeNull();
    expect(dataReceita("")).toBeNull();
  });
});

describe("telefone", () => {
  // Sem hífen: o número vem sem separador e inventar onde ele cai erraria em
  // celular. `normalizePhoneToE164` normaliza depois, na conversão para lead.
  it("joins DDD and number", () => {
    expect(telefone("15", "32842586")).toBe("(15) 32842586");
  });

  it("returns null when either half is missing", () => {
    expect(telefone("", "32842586")).toBeNull();
    expect(telefone("15", "")).toBeNull();
  });
});
