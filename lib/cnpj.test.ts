import { describe, expect, it } from "vitest";
import { normalizeCnpj, formatCnpj } from "./cnpj";

describe("normalizeCnpj", () => {
  it("strips formatting and keeps 14 digits", () => {
    expect(normalizeCnpj("00.000.000/0001-91")).toBe("00000000000191");
    expect(normalizeCnpj("00000000000191")).toBe("00000000000191");
  });

  it("returns null for invalid lengths", () => {
    expect(normalizeCnpj("123")).toBeNull();
    expect(normalizeCnpj(null)).toBeNull();
    expect(normalizeCnpj("")).toBeNull();
  });
});

describe("formatCnpj", () => {
  it("formats 14 digits", () => {
    expect(formatCnpj("00000000000191")).toBe("00.000.000/0001-91");
  });
});
