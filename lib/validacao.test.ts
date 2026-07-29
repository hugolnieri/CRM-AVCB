import { describe, expect, it } from "vitest";
import {
  exigirContato,
  exigirTexto,
  validarCnpj,
  validarEmail,
  validarTelefone,
  validarUf,
} from "./validacao";

describe("exigirTexto", () => {
  it("rejects blank and whitespace-only", () => {
    expect(exigirTexto("", "obrigatório")).toBe("obrigatório");
    expect(exigirTexto("   ", "obrigatório")).toBe("obrigatório");
    expect(exigirTexto("a", "obrigatório")).toBe("obrigatório");
  });

  it("accepts anything from two real characters up", () => {
    expect(exigirTexto("Oi", "obrigatório")).toBeNull();
    expect(exigirTexto("  Padaria São José  ", "obrigatório")).toBeNull();
  });
});

describe("exigirContato", () => {
  it("requires at least one channel", () => {
    expect(exigirContato("", "")).not.toBeNull();
    expect(exigirContato("   ", "  ")).not.toBeNull();
  });

  it("is satisfied by either one alone", () => {
    expect(exigirContato("(15) 99999-8888", "")).toBeNull();
    expect(exigirContato("", "contato@empresa.com.br")).toBeNull();
  });
});

describe("validarTelefone", () => {
  it("accepts 10 and 11 digit numbers, however they are punctuated", () => {
    expect(validarTelefone("(15) 3284-2586")).toBeNull();
    expect(validarTelefone("15992842586")).toBeNull();
  });

  // Antes disso um telefone torto virava phoneE164 null em silêncio, e o link
  // do WhatsApp simplesmente não funcionava.
  it("rejects a number that cannot become E.164", () => {
    expect(validarTelefone("99999")).not.toBeNull();
    expect(validarTelefone("123456789012345")).not.toBeNull();
  });

  it("stays quiet when empty — that is the contact pair's business", () => {
    expect(validarTelefone("")).toBeNull();
  });
});

describe("validarEmail", () => {
  it("accepts empty and well-formed", () => {
    expect(validarEmail("")).toBeNull();
    expect(validarEmail("contato@empresa.com.br")).toBeNull();
  });

  it("rejects malformed", () => {
    expect(validarEmail("contato@")).not.toBeNull();
    expect(validarEmail("empresa.com.br")).not.toBeNull();
  });
});

describe("validarCnpj", () => {
  it("accepts empty and valid", () => {
    expect(validarCnpj("")).toBeNull();
    expect(validarCnpj("00.000.000/0001-91")).toBeNull();
  });

  it("rejects a bad check digit", () => {
    expect(validarCnpj("00.000.000/0001-92")).not.toBeNull();
  });
});

describe("validarUf", () => {
  it("accepts empty and the 27 real ones, in any case", () => {
    expect(validarUf("")).toBeNull();
    expect(validarUf("SP")).toBeNull();
    expect(validarUf("sp")).toBeNull();
    expect(validarUf(" rj ")).toBeNull();
  });

  it("rejects made-up ones", () => {
    expect(validarUf("XX")).not.toBeNull();
    expect(validarUf("S")).not.toBeNull();
  });
});
