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

/**
 * Busca do Manual do Vendedor.
 *
 * Vai além do nome de propósito: quem procura ali costuma lembrar do assunto
 * ("objeção de preço") ou do arquivo ("guia comercial"), e não do rótulo exato
 * do catálogo. Por isso o roteiro escrito e os nomes dos anexos entram na
 * busca junto com nome e sigla.
 */
export function tipoServicoMatchesQuery(
  tipo: { nome: string; sigla: string | null; materialVenda: string | null },
  nomesDeArquivos: string[],
  query: string,
): boolean {
  return matchesQuery([tipo.nome, tipo.sigla, tipo.materialVenda, ...nomesDeArquivos], query);
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
