/**
 * Splits a Brazilian street address into the parts the Corpo de Bombeiros AVCB
 * search expects: a logradouro WITHOUT its type prefix ("Rua", "Av.", "Praça"…)
 * — the site explicitly asks you to omit those — and the building number.
 *
 * Examples:
 *   "Av. João Pilon, 957"            -> { logradouro: "João Pilon", numero: "957" }
 *   "R. Ângelo Luvizotto, 146 - sala 2" -> { logradouro: "Ângelo Luvizotto", numero: "146" }
 *   "Rua Antônio Costa Magueta"      -> { logradouro: "Antônio Costa Magueta", numero: "" }
 */
const STREET_TYPE_PREFIX =
  /^\s*(av|avenida|r|rua|pr|praça|praca|al|alameda|rod|rodovia|trav|travessa|estr|estrada|lgo|largo|pç|pça|via)\.?\s+/i;

export function parseLogradouro(address: string | null): { logradouro: string; numero: string } {
  if (!address) return { logradouro: "", numero: "" };

  const commaIndex = address.indexOf(",");
  const streetPart = commaIndex >= 0 ? address.slice(0, commaIndex) : address;
  const rest = commaIndex >= 0 ? address.slice(commaIndex + 1) : "";

  const logradouro = streetPart.replace(STREET_TYPE_PREFIX, "").trim();

  // First number token after the comma (e.g. "957", "51A", "146" from "146 - sala 2").
  const numberMatch = rest.match(/\d+[A-Za-z]?/);
  const numero = numberMatch ? numberMatch[0] : "";

  return { logradouro, numero };
}

export const BOMBEIROS_AVCB_URL =
  "https://viafacil2.policiamilitar.sp.gov.br/sgsci/Publico/PesquisarAVCBLogradouro.aspx";
