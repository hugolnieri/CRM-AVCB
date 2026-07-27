import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("reads Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("reads PostgREST-style plain objects, which are not Error instances", () => {
    expect(getErrorMessage({ message: "falha na rede" })).toBe("falha na rede");
  });

  it("falls back when there is no usable message", () => {
    expect(getErrorMessage(null, "padrão")).toBe("padrão");
    expect(getErrorMessage({ message: "   " }, "padrão")).toBe("padrão");
    expect(getErrorMessage({ code: 500 }, "padrão")).toBe("padrão");
  });

  it("translates known constraint violations", () => {
    const err = {
      message: 'duplicate key value violates unique constraint "clientes_cnpj_key"',
    };
    expect(getErrorMessage(err)).toBe("Já existe um cliente cadastrado com este CNPJ.");
  });

  it("leaves unknown database errors untouched, so bugs stay visible", () => {
    const err = { message: 'relation "widgets" does not exist' };
    expect(getErrorMessage(err)).toBe('relation "widgets" does not exist');
  });
});
