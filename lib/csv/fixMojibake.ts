/**
 * The scraper's CSV export has accented text double-encoded: the original UTF-8
 * bytes were decoded once as Windows-1252 before being saved, producing sequences
 * like "JoÃ£o" instead of "João". Every accented Latin-1 character UTF-8-encodes to
 * exactly 2 bytes, so each corrupted sequence is always a fixed 2-character pair
 * ("Ã" or "Â" + one Windows-1252 character). We build the full reverse lookup
 * table once and fix matches via regex replace, which (unlike a whole-string
 * decode) tolerates a string that mixes several independent corrupted pairs with
 * plain ASCII, and never throws away an otherwise-fixable cell because one
 * unrelated byte sequence is malformed.
 */

// Windows-1252 differs from Latin-1 only in the 0x80-0x9F range (smart quotes,
// dashes, etc.); 0xA0-0xFF matches Latin-1/Unicode directly.
const CP1252_OVERRIDES: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};

function cp1252Char(byte: number): string {
  return String.fromCodePoint(CP1252_OVERRIDES[byte] ?? byte);
}

function buildMojibakeMap(): Map<string, string> {
  const map = new Map<string, string>();
  // U+0080-U+00FF all UTF-8-encode to exactly 2 bytes; decoding those 2 bytes as
  // Windows-1252 is precisely the corruption this scraper export exhibits.
  for (let codePoint = 0x80; codePoint <= 0xff; codePoint++) {
    const original = String.fromCodePoint(codePoint);
    const bytes = new TextEncoder().encode(original);
    const mojibake = Array.from(bytes, cp1252Char).join("");
    if (mojibake !== original) map.set(mojibake, original);
  }
  // "à" mojibakes through U+00A0 (NBSP), which some pipelines normalize to a
  // plain space before the data reaches us — recognize that degraded form too.
  map.set("Ã ", "à");
  return map;
}

const MOJIBAKE_TO_CHAR = buildMojibakeMap();
const MOJIBAKE_PATTERN = new RegExp(Array.from(MOJIBAKE_TO_CHAR.keys()).join("|"), "g");

export function fixMojibake(text: string): string {
  if (!text || !/[ÃÂ]/.test(text)) return text;
  return text.replace(MOJIBAKE_PATTERN, (match) => MOJIBAKE_TO_CHAR.get(match) ?? match);
}
