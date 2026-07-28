import { describe, expect, it } from "vitest";
import { sugerirVencimento } from "./servicos";

describe("sugerirVencimento", () => {
  it("adds the type's validity in months", () => {
    expect(sugerirVencimento("2026-07-27", 24)).toBe("2028-07-27");
    expect(sugerirVencimento("2026-07-27", 12)).toBe("2027-07-27");
    expect(sugerirVencimento("2026-07-27", 36)).toBe("2029-07-27");
  });

  it("returns null when the type has no validity or there is no date", () => {
    expect(sugerirVencimento("2026-07-27", null)).toBeNull();
    expect(sugerirVencimento("2026-07-27", 0)).toBeNull();
    expect(sugerirVencimento("", 12)).toBeNull();
  });

  // Fixado de propósito: uma mudança futura no dayjs não pode deslocar
  // silenciosamente o vencimento de certificados já emitidos.
  it("clamps to the end of the month when the day does not exist there", () => {
    expect(sugerirVencimento("2026-01-31", 1)).toBe("2026-02-28");
    expect(sugerirVencimento("2026-08-31", 1)).toBe("2026-09-30");
  });

  it("handles leap days", () => {
    expect(sugerirVencimento("2028-02-29", 12)).toBe("2029-02-28");
    expect(sugerirVencimento("2028-02-29", 48)).toBe("2032-02-29");
  });
});
