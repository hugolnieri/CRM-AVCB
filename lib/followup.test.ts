import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { followUpBucket } from "./followup";

describe("followUpBucket", () => {
  const now = dayjs("2026-07-02T15:00:00");

  it("marca hoje mais tarde como 'hoje', não 'atrasado'", () => {
    expect(followUpBucket("2026-07-02T20:00:00", now)).toBe("hoje");
  });

  it("marca hoje mais cedo (já passou a hora) ainda como 'hoje'", () => {
    expect(followUpBucket("2026-07-02T09:00:00", now)).toBe("hoje");
  });

  it("marca meia-noite de hoje como 'hoje' (data escolhida sem hora)", () => {
    expect(followUpBucket("2026-07-02T00:00:00", now)).toBe("hoje");
  });

  it("marca um dia anterior como 'atrasado'", () => {
    expect(followUpBucket("2026-07-01T23:00:00", now)).toBe("atrasado");
  });

  it("marca dentro de 7 dias como 'proximos'", () => {
    expect(followUpBucket("2026-07-05T10:00:00", now)).toBe("proximos");
  });

  it("marca além de 7 dias como 'futuro'", () => {
    expect(followUpBucket("2026-07-20T10:00:00", now)).toBe("futuro");
  });
});
