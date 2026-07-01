import type { LicencaTipo } from "@/types/lead";

export const LICENCA_TIPOS: { value: LicencaTipo; label: string }[] = [
  { value: "AVCB", label: "AVCB" },
  { value: "CLCB", label: "CLCB" },
  { value: "TAACB", label: "TAACB" },
];

/** Maps the free-text `tipo_licenca` returned by the Bombeiros API to our enum. */
export function normalizeTipoLicenca(raw: string): LicencaTipo {
  const s = raw.toUpperCase();
  if (s.includes("CLCB")) return "CLCB";
  if (s.includes("TAACB")) return "TAACB";
  return "AVCB";
}
