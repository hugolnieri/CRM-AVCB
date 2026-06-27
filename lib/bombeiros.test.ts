import { describe, expect, it } from "vitest";
import { inferAvcbStatus } from "./bombeiros";

describe("inferAvcbStatus", () => {
  it("recognizes valid/current licenses", () => {
    expect(inferAvcbStatus("AVCB Vigente")).toBe("em_dia");
    expect(inferAvcbStatus("CLCB Vigente")).toBe("em_dia");
    expect(inferAvcbStatus("Situação Regular")).toBe("em_dia");
  });

  it("recognizes expired/invalid licenses", () => {
    expect(inferAvcbStatus("AVCB Vencido")).toBe("vencido");
    expect(inferAvcbStatus("Cancelado")).toBe("vencido");
    expect(inferAvcbStatus("Cassado")).toBe("vencido");
  });

  it("falls back to nao_informado for unrecognized text", () => {
    expect(inferAvcbStatus("Em análise")).toBe("nao_informado");
    expect(inferAvcbStatus("")).toBe("nao_informado");
  });
});
