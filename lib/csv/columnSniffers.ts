const PHONE_RE = /\(\d{2}\)\s?\d{4,5}-\d{4}/;

// Longest/most-specific prefix first so "Aberto 24 horas" isn't shadowed by "Aberto".
const STATUS_PREFIXES = [
  "Aberto 24 horas",
  "Fecha em breve",
  "Abre em breve",
  "Fechado",
  "Aberto",
];

const HOURS_RE = /\d{1,2}:\d{2}/;
const HOURS_KEYWORDS_RE = /abre|fecha|horas/i;

export function isPhoneCell(cell: string): boolean {
  return PHONE_RE.test(cell);
}

export function matchStatus(cell: string): string | null {
  const trimmed = cell.trim();
  const match = STATUS_PREFIXES.find((prefix) => trimmed.startsWith(prefix));
  return match ? trimmed : null;
}

export function isHoursCell(cell: string): boolean {
  return HOURS_RE.test(cell) && HOURS_KEYWORDS_RE.test(cell);
}

/**
 * The Material-icon ligature glyph is a Private Use Area codepoint (U+E000-U+F8FF)
 * encoded as 3 UTF-8 bytes; mojibake'd as Windows-1252 it becomes 3 separate
 * characters (e.g. "î¤´"). `fixMojibake` only repairs 2-byte sequences, so this
 * token survives untouched — detect it directly by re-decoding it as UTF-8.
 */
function isIconGlyphCell(cell: string): boolean {
  if (cell.length === 0 || cell.length > 4) return false;
  try {
    const bytes = Uint8Array.from(cell, (ch) => ch.charCodeAt(0));
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return [...decoded].every((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code >= 0xe000 && code <= 0xf8ff;
    });
  } catch {
    return false;
  }
}

/**
 * Separator dots ("·", already fixed from "Â·" by the time this runs) and the
 * icon ligature glyph carry no business data and must be skipped before falling
 * back to "unrecognized cell -> address".
 */
export function isIgnorableCell(cell: string): boolean {
  const trimmed = cell.trim();
  if (trimmed === "" || trimmed === "·") return true;
  return isIconGlyphCell(trimmed);
}

export function looksLikeAddress(cell: string): boolean {
  return /\d/.test(cell);
}

export function extractPlaceId(mapsUrl: string): string | null {
  const match = mapsUrl.match(/!19s([^!?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function extractLatLng(mapsUrl: string): { lat: number | null; lng: number | null } {
  const match = mapsUrl.match(/!3d(-?[\d.]+)!4d(-?[\d.]+)/);
  if (!match) return { lat: null, lng: null };
  return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
}

export function parseRating(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const value = parseFloat(raw.replace(",", "."));
  return Number.isNaN(value) ? null : value;
}

export function parseReviewCount(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const digits = raw.replace(/[()]/g, "").replace(/\./g, "").trim();
  const value = parseInt(digits, 10);
  return Number.isNaN(value) ? null : value;
}

export function stripWrappingQuotes(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^"+|"+$/g, "");
  return trimmed === "" ? null : trimmed;
}
