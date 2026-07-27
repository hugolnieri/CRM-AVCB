import { describe, expect, it } from "vitest";
import { normalizePhoneToE164 } from "./phone";

describe("normalizePhoneToE164", () => {
  it("accepts 10-digit landlines and 11-digit mobiles", () => {
    expect(normalizePhoneToE164("(15) 3284-2586")).toBe("+551532842586");
    expect(normalizePhoneToE164("15 99999-8888")).toBe("+5515999998888");
  });

  it("returns null rather than guessing at malformed input", () => {
    expect(normalizePhoneToE164(null)).toBeNull();
    expect(normalizePhoneToE164("")).toBeNull();
    expect(normalizePhoneToE164("3284-2586")).toBeNull();
    expect(normalizePhoneToE164("+55 15 3284-2586 ramal 12")).toBeNull();
  });
});
