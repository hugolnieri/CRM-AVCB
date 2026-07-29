import { describe, expect, it } from "vitest";
import { gerarSenha, validarConfirmacao, validarSenha, SENHA_MINIMA } from "./senha";

describe("gerarSenha", () => {
  it("respects the requested length and the minimum", () => {
    expect(gerarSenha()).toHaveLength(12);
    expect(gerarSenha(20)).toHaveLength(20);
    expect(gerarSenha().length).toBeGreaterThanOrEqual(SENHA_MINIMA);
  });

  // O ponto do alfabeto restrito: a senha vai ser ditada por telefone uma vez.
  it("avoids characters that are ambiguous when read aloud", () => {
    const amostra = Array.from({ length: 200 }, () => gerarSenha(24)).join("");
    for (const ambiguo of ["0", "O", "1", "l", "I", "5", "S", "2", "Z"]) {
      expect(amostra).not.toContain(ambiguo);
    }
  });

  it("has no symbols, which are a nuisance on a phone keyboard", () => {
    const amostra = Array.from({ length: 100 }, () => gerarSenha(24)).join("");
    expect(amostra).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("does not repeat itself", () => {
    const geradas = new Set(Array.from({ length: 500 }, () => gerarSenha()));
    expect(geradas.size).toBe(500);
  });
});

describe("validarSenha", () => {
  it("rejects anything shorter than the minimum", () => {
    expect(validarSenha("")).not.toBeNull();
    expect(validarSenha("a".repeat(SENHA_MINIMA - 1))).not.toBeNull();
  });

  it("accepts the minimum exactly", () => {
    expect(validarSenha("a".repeat(SENHA_MINIMA))).toBeNull();
  });
});

describe("validarConfirmacao", () => {
  it("requires an exact match", () => {
    expect(validarConfirmacao("SenhaBoa123", "SenhaBoa123")).toBeNull();
    expect(validarConfirmacao("SenhaBoa123", "senhaboa123")).not.toBeNull();
    expect(validarConfirmacao("SenhaBoa123", "")).not.toBeNull();
  });
});
