import type { Lead } from "@/types/lead";

/**
 * Lowercase + strip diacritics, so "joao" matches "João" and vice-versa.
 *
 * O range de marcas combinantes fica num RegExp construido a partir de string,
 * com escapes \u0300-\u036f: um literal /[..]/ com os caracteres combinantes
 * crus se corrompe em qualquer re-save que nao seja UTF-8, e o bug e silencioso.
 */
const COMBINING_MARKS = new RegExp("[\u0300-\u036f]", "g");

export function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

/** Verdadeiro se a busca estiver vazia ou casar com qualquer um dos campos. */
export function matchesQuery(
  fields: (string | null | undefined)[],
  query: string,
): boolean {
  const q = normalizeForSearch(query.trim());
  if (!q) return true;
  return fields.some((field) => field && normalizeForSearch(field).includes(q));
}

/** Busca livre pelos campos que alguém plausivelmente lembraria de um lead. */
export function leadMatchesQuery(lead: Lead, query: string): boolean {
  return matchesQuery(
    [
      lead.name,
      lead.contatoNome,
      lead.cnpj,
      lead.address,
      lead.cidade,
      lead.phoneRaw,
      lead.email,
      lead.interesse,
      lead.origem,
    ],
    query,
  );
}
