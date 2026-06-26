import Papa from "papaparse";
import { fixMojibake } from "./fixMojibake";
import {
  extractLatLng,
  extractPlaceId,
  isHoursCell,
  isIgnorableCell,
  isPhoneCell,
  looksLikeAddress,
  matchStatus,
  parseRating,
  parseReviewCount,
  stripWrappingQuotes,
} from "./columnSniffers";
import { normalizePhoneToE164 } from "./normalizePhone";
import type { ParsedLead } from "@/types/lead";

const KNOWN_HEADER_MARKER = "hfpxzc";
// Fixed columns from the left: maps url, name, rating, review count, category.
const LEFT_FIXED_COUNT = 5;
// Fixed columns from the right: phone, photo url, reviewer avatar (ignored), review snippet.
const RIGHT_FIXED_COUNT = 4;
const MIN_COLUMNS = LEFT_FIXED_COUNT + RIGHT_FIXED_COUNT;

function hasHeaderRow(rows: string[][]): boolean {
  return rows.length > 0 && rows[0][0]?.includes(KNOWN_HEADER_MARKER) === true;
}

function interpretMiddleColumns(middle: string[]): {
  address: string | null;
  status: string | null;
  hours: string | null;
} {
  let address: string | null = null;
  let status: string | null = null;
  let hours: string | null = null;

  for (const raw of middle) {
    const cell = raw.trim();

    if (isIgnorableCell(cell)) continue;
    if (isPhoneCell(cell)) continue; // a phone leaking into the middle: fixed-position phone wins

    if (!status) {
      const matched = matchStatus(cell);
      if (matched) {
        status = matched;
        continue;
      }
    }

    if (!hours && isHoursCell(cell)) {
      hours = cell;
      continue;
    }

    if (!address && looksLikeAddress(cell)) {
      address = cell;
      continue;
    }

    if (!address) address = cell;
  }

  return { address, status, hours };
}

function parseRow(rawCells: string[]): ParsedLead | null {
  if (rawCells.length < MIN_COLUMNS) return null;

  const cells = rawCells.map((cell) => fixMojibake(cell));

  const mapsUrl = cells[0]?.trim();
  const name = cells[1]?.trim();
  if (!mapsUrl || !name) return null;

  const ratingRaw = cells[2];
  const reviewRaw = cells[3];
  const category = cells[4]?.trim() || null;

  const phoneRaw = cells[cells.length - 4]?.trim() || null;
  const photoUrl = cells[cells.length - 3]?.trim() || null;
  const reviewSnippetRaw = cells[cells.length - 1];

  const middle = cells.slice(LEFT_FIXED_COUNT, cells.length - RIGHT_FIXED_COUNT);
  const { address, status, hours } = interpretMiddleColumns(middle);
  const { lat, lng } = extractLatLng(mapsUrl);

  return {
    mapsUrl,
    placeId: extractPlaceId(mapsUrl),
    name,
    rating: parseRating(ratingRaw),
    reviewCount: parseReviewCount(reviewRaw),
    category,
    address,
    status,
    hours,
    phoneRaw,
    phoneE164: normalizePhoneToE164(phoneRaw),
    lat,
    lng,
    photoUrl,
    lastReviewSnippet: stripWrappingQuotes(reviewSnippetRaw),
  };
}

function dedupeByPlaceIdOrUrl(leads: ParsedLead[]): ParsedLead[] {
  const seen = new Map<string, ParsedLead>();
  for (const lead of leads) {
    const key = lead.placeId ?? lead.mapsUrl;
    if (!seen.has(key)) seen.set(key, lead);
  }
  return Array.from(seen.values());
}

export function parseGoogleScraperCsv(rawCsvText: string): ParsedLead[] {
  const { data } = Papa.parse<string[]>(rawCsvText, {
    skipEmptyLines: "greedy",
  });

  const rows = hasHeaderRow(data) ? data.slice(1) : data;

  const parsed = rows
    .filter((row) => row.some((cell) => cell?.trim() !== ""))
    .map(parseRow)
    .filter((lead): lead is ParsedLead => lead !== null);

  return dedupeByPlaceIdOrUrl(parsed);
}
