import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseGoogleScraperCsv } from "./parseGoogleScraperCsv";
import { fixMojibake } from "./fixMojibake";
import { normalizePhoneToE164 } from "./normalizePhone";
import type { ParsedLead } from "@/types/lead";

const csvText = readFileSync(path.resolve(__dirname, "../../google.csv"), "utf-8");

function byName(leads: ParsedLead[], name: string): ParsedLead {
  const lead = leads.find((l) => l.name === name);
  if (!lead) throw new Error(`Lead not found: ${name}`);
  return lead;
}

describe("fixMojibake", () => {
  it("repairs common Windows-1252-as-UTF-8 sequences", () => {
    expect(fixMojibake("JoÃ£o")).toBe("João");
    expect(fixMojibake("AntÃ´nio")).toBe("Antônio");
    expect(fixMojibake("opÃ§Ãµes")).toBe("opções");
    expect(fixMojibake("LuÃ­z")).toBe("Luíz");
    expect(fixMojibake("Â· Abre sex. Ã s 08:00")).toBe("· Abre sex. às 08:00");
  });

  it("leaves clean text and the icon ligature glyph untouched", () => {
    expect(fixMojibake("Fechado")).toBe("Fechado");
    expect(fixMojibake("î¤´")).toBe("î¤´");
    expect(fixMojibake("")).toBe("");
  });
});

describe("normalizePhoneToE164", () => {
  it("normalizes landline (10 digit) and mobile (11 digit) BR numbers", () => {
    expect(normalizePhoneToE164("(15) 3384-1040")).toBe("+551533841040");
    expect(normalizePhoneToE164("(15) 98119-3518")).toBe("+5515981193518");
  });

  it("returns null for missing or malformed numbers", () => {
    expect(normalizePhoneToE164(null)).toBeNull();
    expect(normalizePhoneToE164("123")).toBeNull();
  });
});

describe("parseGoogleScraperCsv", () => {
  const leads = parseGoogleScraperCsv(csvText);

  it("dedupes exact-duplicate rows (Vivenda do Trigo appears twice in the export)", () => {
    const matches = leads.filter((l) => l.name === "Vivenda do Trigo");
    expect(matches).toHaveLength(1);
  });

  it("parses a standard row with the icon column present", () => {
    const lead = byName(leads, "Shopping Fiori");
    expect(lead.address).toBe("Av. João Pilon, 957");
    expect(lead.status).toBe("Fechado");
    expect(lead.hours).toBe("· Abre sex. às 08:00");
    expect(lead.category).toBe("Loja de variedades");
    expect(lead.rating).toBe(4.5);
    expect(lead.reviewCount).toBe(322);
    expect(lead.phoneE164).toBe("+551533841040");
    expect(lead.lastReviewSnippet).toBe("Bom atendimento com grande variedades em produtos.");
    expect(lead.placeId).not.toBeNull();
    expect(lead.lat).toBeCloseTo(-23.1668699);
    expect(lead.lng).toBeCloseTo(-47.7566362);
  });

  it("parses review counts with thousands separators", () => {
    const lead = byName(leads, "Coocerqui - João Pilon");
    expect(lead.reviewCount).toBe(2108);
    expect(lead.address).toBe("Av. João Pilon, 1333");
  });

  it("correctly shifts column interpretation for rows without the icon column", () => {
    const lead = byName(leads, "CERQUILHO MOTORES");
    expect(lead.address).toBe("Av. Pres. Washington Luíz, 1370");
    expect(lead.status).toBe("Fechado");
    expect(lead.hours).toBe("· Abre sex. às 07:30");
  });

  it("falls back to using the cell as address when it has no digits", () => {
    const lead = byName(leads, "GG Tecidos");
    expect(lead.address).toBe("Rua Antônio Costa Magueta");
  });

  it("handles missing rating/review count and a garbage address", () => {
    const lead = byName(leads, "Pura Porcelana Cerquilho");
    expect(lead.rating).toBeNull();
    expect(lead.reviewCount).toBeNull();
    expect(lead.address).toBe("N/A");
  });

  it("recognizes 'Aberto 24 horas' as a status with no separate hours text", () => {
    const lead = byName(leads, "Pet Walk - Cerquilho");
    expect(lead.status).toBe("Aberto 24 horas");
    expect(lead.hours).toBeNull();
    expect(lead.phoneE164).toBe("+5515981193518");
    expect(lead.lastReviewSnippet).toBe("Entrega");
  });

  it("recognizes 'Aberto' plus a closing-time hours string", () => {
    const lead = byName(leads, "Droga Raia");
    expect(lead.status).toBe("Aberto");
    expect(lead.hours).toBe("· Fecha 23:00");
  });

  it("parses a pasted block with no header row", () => {
    const dataLine = csvText.trim().split("\n").slice(3, 4).join("\n");
    const withoutHeader = parseGoogleScraperCsv(dataLine);
    expect(withoutHeader).toHaveLength(1);
    expect(withoutHeader[0].name).toBe("Shopping Fiori");
  });
});
