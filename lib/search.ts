import type { Lead } from "@/types/lead";

/** Lowercase + strip diacritics, so "joao" matches "João" and vice-versa. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Free-text search across every field a user might plausibly remember a lead
 * by: name, address (covers city/bairro since it's embedded in the string),
 * category, phone, CNPJ, and anything we've enriched from the Receita lookup.
 */
export function leadMatchesQuery(lead: Lead, query: string): boolean {
  const q = normalizeForSearch(query.trim());
  if (!q) return true;

  const haystacks = [
    lead.name,
    lead.address,
    lead.category,
    lead.phoneRaw,
    lead.cnpj,
    lead.receitaData?.razaoSocial,
    lead.receitaData?.nomeFantasia,
    lead.receitaData?.cnae,
  ];

  return haystacks.some((field) => field && normalizeForSearch(field).includes(q));
}
