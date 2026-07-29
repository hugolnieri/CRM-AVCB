import type { TipoServico } from "@/types/servico";

/**
 * CNAE — a atividade econômica da empresa, e o que permite o sistema sugerir
 * sozinho o que dá para vender para ela.
 *
 * O código é hierárquico, e é isso que faz a coisa toda funcionar:
 *
 *     41  20  -4 /00
 *     ├─ divisão (2)      41    = Construção de edifícios
 *     ├─ grupo (3)        412
 *     ├─ classe (4)       4120
 *     └─ subclasse (7)    4120400
 *
 * Por isso o catálogo guarda **prefixos**, não códigos completos: configurar
 * "41" no NR-35 cobre toda a construção de edifícios de uma vez, e ninguém
 * precisa cadastrar as centenas de subclasses embaixo. Um prefixo mais longo
 * ainda funciona quando a regra é mais específica.
 */

export function apenasDigitosCnae(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** "4120400" → "4120-4/00". Devolve a entrada se não tiver 7 dígitos. */
export function formatarCnae(valor: string): string {
  const d = apenasDigitosCnae(valor);
  if (d.length !== 7) return valor;
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5)}`;
}

/**
 * CNAE completo tem 7 dígitos. Não há dígito verificador padronizado que valha
 * a pena checar aqui — o que erra na prática é o comprimento.
 */
export function cnaeValido(valor: string): boolean {
  return apenasDigitosCnae(valor).length === 7;
}

/** Mensagem de erro ou null, no contrato do `validate` do @mantine/form. */
export function validarCnae(valor: string): string | null {
  if (valor.trim() === "") return null;
  return cnaeValido(valor) ? null : "CNAE inválido. São 7 dígitos, como 4120-4/00.";
}

/**
 * Prefixo aceitável no catálogo: de 2 (divisão) a 7 (subclasse) dígitos.
 *
 * Um dígito só seria a seção inteira da economia e casaria com quase tudo —
 * uma sugestão que aponta para tudo não sugere nada.
 */
export function validarPrefixoCnae(valor: string): string | null {
  const d = apenasDigitosCnae(valor);
  if (d.length < 2) return "Use ao menos 2 dígitos (a divisão do CNAE).";
  if (d.length > 7) return "No máximo 7 dígitos.";
  return null;
}

/** Normaliza a lista digitada pelo admin, descartando o que não serve. */
export function normalizarPrefixos(valores: string[]): string[] {
  const limpos = valores
    .map(apenasDigitosCnae)
    .filter((d) => d.length >= 2 && d.length <= 7);
  return Array.from(new Set(limpos)).sort();
}

/** O CNAE da empresa cai sob algum dos prefixos configurados? */
export function cnaeCasaPrefixos(cnae: string, prefixos: string[] | null): boolean {
  const d = apenasDigitosCnae(cnae);
  if (d === "" || !prefixos || prefixos.length === 0) return false;
  return prefixos.some((p) => {
    const prefixo = apenasDigitosCnae(p);
    return prefixo !== "" && d.startsWith(prefixo);
  });
}

/**
 * Os serviços do catálogo que fazem sentido para esta atividade econômica.
 *
 * Só tipos ativos: um serviço que a empresa parou de prestar não deve voltar
 * pela porta da sugestão automática.
 *
 * A ordem é do prefixo mais específico para o mais genérico — uma regra escrita
 * para a subclasse exata é mais deliberada do que uma que pegou a divisão
 * inteira, e merece aparecer antes.
 */
export function servicosParaCnae(cnae: string, tipos: TipoServico[]): TipoServico[] {
  const d = apenasDigitosCnae(cnae);
  if (d === "") return [];

  return tipos
    .filter((t) => t.ativo && cnaeCasaPrefixos(d, t.cnaes))
    .map((t) => ({ tipo: t, peso: especificidade(d, t.cnaes) }))
    .sort((a, b) => b.peso - a.peso || a.tipo.ordem - b.tipo.ordem)
    .map((x) => x.tipo);
}

/** Comprimento do prefixo mais específico que casou. */
function especificidade(cnaeDigitos: string, prefixos: string[] | null): number {
  if (!prefixos) return 0;
  return prefixos
    .map(apenasDigitosCnae)
    .filter((p) => p !== "" && cnaeDigitos.startsWith(p))
    .reduce((maior, p) => Math.max(maior, p.length), 0);
}
