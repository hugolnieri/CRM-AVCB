import { describe, expect, it } from "vitest";
import { apenasDigitos, cnpjValido, formatarCnpj } from "./cnpj";

describe("cnpjValido", () => {
  it("accepts real CNPJs, formatted or not", () => {
    // Banco do Brasil S.A.
    expect(cnpjValido("00.000.000/0001-91")).toBe(true);
    expect(cnpjValido("00000000000191")).toBe(true);
    // Petrobras.
    expect(cnpjValido("33.000.167/0001-01")).toBe(true);
  });

  it("rejects a single wrong digit", () => {
    expect(cnpjValido("00.000.000/0001-92")).toBe(false);
    expect(cnpjValido("33.000.167/0001-02")).toBe(false);
  });

  it("rejects the wrong number of digits", () => {
    expect(cnpjValido("")).toBe(false);
    expect(cnpjValido("123")).toBe(false);
    expect(cnpjValido("000000000001911")).toBe(false);
  });

  // Passam no módulo 11 e são o que alguém digita para preencher o campo.
  it("rejects repeated-digit sequences even though the checksum works out", () => {
    expect(cnpjValido("00000000000000")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
    expect(cnpjValido("99999999999999")).toBe(false);
  });

  it("ignores punctuation and spaces around the digits", () => {
    expect(cnpjValido("  00 000 000 / 0001 - 91  ")).toBe(true);
  });
});

describe("formatarCnpj", () => {
  it("formats 14 digits", () => {
    expect(formatarCnpj("00000000000191")).toBe("00.000.000/0001-91");
  });

  it("returns the input untouched when it is not 14 digits", () => {
    expect(formatarCnpj("123")).toBe("123");
    expect(formatarCnpj("")).toBe("");
  });
});

describe("apenasDigitos", () => {
  it("strips everything that is not a digit", () => {
    expect(apenasDigitos("00.000.000/0001-91")).toBe("00000000000191");
  });
});
