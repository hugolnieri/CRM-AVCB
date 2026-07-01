import { NextResponse } from "next/server";

/**
 * Reverse-geocodes a lead's coordinates into a full postal address (with CEP).
 * The Google Maps scraper only exports street + number, so we enrich it on
 * demand from the lat/lng using Nominatim (OpenStreetMap) — free, no API key.
 *
 * Done server-side so we can send the descriptive User-Agent Nominatim's usage
 * policy requires (browsers can't set it), and to keep calls low-volume/serial.
 */

interface NominatimAddress {
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  postcode?: string;
}

function formatAddress(addr: NominatimAddress): string {
  const road = addr.road ?? "";
  const number = addr.house_number ? `, ${addr.house_number}` : "";
  const district = addr.suburb ?? addr.neighbourhood ?? "";
  const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? "";
  const state = addr.state ?? "";
  const cep = addr.postcode ?? "";

  const line1 = `${road}${number}`.trim();
  const parts = [line1, district, [city, state].filter(Boolean).join(" - "), cep ? `CEP ${cep}` : ""];

  return parts.filter((p) => p && p.trim() !== "").join(", ");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Coordenadas ausentes" }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    lat,
  )}&lon=${encodeURIComponent(lng)}&addressdetails=1&accept-language=pt-BR`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "CRM-AVCB/1.0 (contato: hugo.poltronieri99@gmail.com)",
      },
      // Cache results for a day — coordinates map to a stable address.
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Falha ao consultar o serviço de endereço" }, { status: 502 });
    }

    const data = (await res.json()) as { address?: NominatimAddress; display_name?: string };
    const addr = data.address;
    const address = addr ? formatAddress(addr) : data.display_name ?? "";

    if (!address) {
      return NextResponse.json({ error: "Endereço não encontrado para estas coordenadas" }, { status: 404 });
    }

    const cidade =
      addr?.city ?? addr?.town ?? addr?.village ?? addr?.municipality ?? null;

    // `address` (single line) kept for backward-compat; structured fields let the
    // UI show one piece of info per line. Note: house_number is usually absent —
    // the client fills it from the imported Google Maps address instead.
    return NextResponse.json({
      address,
      cep: addr?.postcode ?? null,
      municipio: cidade,
      logradouro: addr?.road ?? null,
      numero: addr?.house_number ?? null,
      bairro: addr?.suburb ?? addr?.neighbourhood ?? null,
      cidade,
      uf: addr?.state ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao consultar o serviço de endereço" }, { status: 502 });
  }
}
