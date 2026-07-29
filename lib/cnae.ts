import type { TipoServico } from "@/types/servico";
import { normalizeForSearch } from "@/lib/search";
import { CNAE_CATALOGO, type EntradaCnae } from "@/lib/cnaeCatalogo";

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
 * Aceita qualquer nível da hierarquia: 2 dígitos (divisão/segmento), 5 (classe)
 * ou 7 (subclasse completa).
 *
 * Não exige os 7 de propósito. Quem cadastra costuma saber o ramo — "construção"
 * — e não o código exato; recusar a divisão obrigaria a inventar dígitos, que é
 * pior que guardar menos precisão. O casamento com o catálogo é por prefixo, e
 * funciona igual nos três níveis.
 */
export function cnaeValido(valor: string): boolean {
  const n = apenasDigitosCnae(valor).length;
  return n >= 2 && n <= 7;
}

/** Mensagem de erro ou null, no contrato do `validate` do @mantine/form. */
export function validarCnae(valor: string): string | null {
  if (valor.trim() === "") return null;
  return cnaeValido(valor)
    ? null
    : "CNAE inválido. Use de 2 a 7 dígitos — a divisão (41) ou o código completo (4120-4/00).";
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

// --- catálogo: escrever o ramo em vez do código --------------------------------

/**
 * O nome da atividade, quando o código cai numa entrada conhecida.
 *
 * Procura do mais específico para o mais genérico: classe (5 dígitos) antes de
 * divisão (2). Um CNAE completo de 7 dígitos casa com a classe pelo prefixo,
 * porque o dígito verificador fica na quinta posição — `4120400` começa com
 * `41204`.
 */
export function descreverCnae(cnae: string): string | null {
  const d = apenasDigitosCnae(cnae);
  if (d.length < 2) return null;

  const classe = CNAE_CATALOGO.find(([c]) => c.length === 5 && d.startsWith(c));
  if (classe) return classe[1];

  const divisao = CNAE_CATALOGO.find(([c]) => c.length === 2 && d.startsWith(c));
  return divisao ? divisao[1] : null;
}

/**
 * O segmento — a divisão do CNAE. É a granularidade em que as pessoas pensam o
 * ramo de uma empresa ("construção", "metalurgia", "alimentos"), e a que serve
 * para decidir o que oferecer.
 */
export function segmentoDoCnae(cnae: string): EntradaCnae | null {
  const d = apenasDigitosCnae(cnae);
  if (d.length < 2) return null;
  return CNAE_CATALOGO.find(([c]) => c.length === 2 && d.startsWith(c)) ?? null;
}

export interface SugestaoCnae {
  codigo: string;
  descricao: string;
  /** Divisão é o "segmento"; classe é o ramo específico dentro dele. */
  nivel: "divisao" | "classe";
  /** Nome da divisão a que a classe pertence — some quando já é a divisão. */
  segmento: string | null;
}

/**
 * Busca por código **ou** por nome da atividade, que é o ponto: quem cadastra
 * quase nunca sabe o CNAE de cor, mas sabe dizer "padaria" ou "construção".
 *
 * Sem termo devolve as divisões, que funcionam como a lista de segmentos para
 * folhear.
 */
export function buscarCnae(termo: string, limite = 12): SugestaoCnae[] {
  const digitos = apenasDigitosCnae(termo);
  const texto = normalizeForSearch(termo.trim());

  if (termo.trim() === "") {
    return CNAE_CATALOGO.filter(([c]) => c.length === 2)
      .slice(0, limite)
      .map(montar);
  }

  // Quem digitou número quer código; casa nos dois sentidos, para o CNAE
  // completo de 7 dígitos encontrar a classe de 5 e vice-versa.
  if (digitos.length >= 2 && texto.replace(/[^a-z]/g, "") === "") {
    return CNAE_CATALOGO.filter(([c]) => c.startsWith(digitos) || digitos.startsWith(c))
      .sort((a, b) => b[0].length - a[0].length)
      .slice(0, limite)
      .map(montar);
  }

  const casam = CNAE_CATALOGO.filter(([, descricao]) =>
    normalizeForSearch(descricao).includes(texto),
  );

  // Quem casa no começo do nome primeiro: buscar "padaria" deve trazer
  // "Padaria e Confeitaria" antes de "Comércio Varejista de Padaria".
  return casam
    .sort((a, b) => {
      const comecaA = normalizeForSearch(a[1]).startsWith(texto) ? 0 : 1;
      const comecaB = normalizeForSearch(b[1]).startsWith(texto) ? 0 : 1;
      if (comecaA !== comecaB) return comecaA - comecaB;
      return a[1].length - b[1].length;
    })
    .slice(0, limite)
    .map(montar);
}

function montar([codigo, descricao]: EntradaCnae): SugestaoCnae {
  const nivel = codigo.length === 2 ? ("divisao" as const) : ("classe" as const);
  const divisao = nivel === "classe" ? segmentoDoCnae(codigo) : null;
  return { codigo, descricao, nivel, segmento: divisao ? divisao[1] : null };
}

/** "41204" → "4120-4"; "4120400" → "4120-4/00"; divisão fica como está. */
export function exibirCodigo(codigo: string): string {
  const d = apenasDigitosCnae(codigo);
  if (d.length === 7) return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5)}`;
  if (d.length === 5) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return d;
}
