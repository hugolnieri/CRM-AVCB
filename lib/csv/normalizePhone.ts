/**
 * Brazilian numbers: 10 digits (DDD + 8-digit landline) or 11 digits
 * (DDD + 9-digit mobile). Anything else is malformed input we shouldn't guess at.
 */
export function normalizePhoneToE164(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  return null;
}
