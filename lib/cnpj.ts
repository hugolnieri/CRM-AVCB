/** Strips formatting and validates a Brazilian CNPJ has 14 digits. */
export function normalizeCnpj(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
}

/** Formats 14 digits as 00.000.000/0000-00 for display. */
export function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
