/**
 * Leitura do formato dos dados abertos do CNPJ — a parte que erra em silêncio.
 *
 * Separado de `prospectar.mjs` para ficar sob teste (`lib/receita.test.ts`), o
 * que importa aqui mais que em qualquer outro lugar: todo erro deste arquivo é
 * do tipo que produz dado errado em vez de exceção.
 */

// Marcas de acento separadas pelo NFD. Escrito com `new RegExp` e escapes em vez
// de literal: os próprios caracteres combinantes já se corromperam uma vez, e
// num literal a corrupção passa despercebida.
const MARCAS = new RegExp("[\u0300-\u036f]", "g");

/** Sem acento, sem pontuação, maiúsculo: é assim que os dois lados se encontram. */
export function normalizar(texto) {
  return (texto ?? "")
    .normalize("NFD")
    .replace(MARCAS, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function apenasDigitos(v) {
  return (v ?? "").replace(/\D/g, "");
}

/**
 * Um número par de aspas significa que todos os campos citados fecharam.
 *
 * `charCodeAt` e não `texto[i]`: indexar por colchete cria uma string de um
 * caractere a cada volta, e isto roda ~30 milhões de vezes por parte.
 */
export function aspasFechadas(texto) {
  let n = 0;
  for (let i = 0; i < texto.length; i++) if (texto.charCodeAt(i) === 34) n++;
  return (n & 1) === 0;
}

const SEPARADOR = '";"';

/**
 * `"a";"b";"c"` → `["a","b","c"]`.
 *
 * NÃO dá para usar `split(";")`: os campos são citados e alguns contêm ponto e
 * vírgula de verdade — razão social e complemento de endereço, principalmente.
 * O split ingênuo transforma essas linhas em 31 colunas. Foi o primeiro erro que
 * o arquivo real acusou.
 *
 * Mas o caminho cuidadoso é caractere a caractere, e são ~30 milhões de linhas
 * por parte: medido, ele sozinho custa mais que baixar os 2 GB. Então o caminho
 * normal é um split pelo separador **completo** `";"`, que só casa entre campos,
 * e o cuidadoso fica de reserva para a linha rara que o rápido erra.
 */
export function colunas(linha, esperado) {
  if (linha.length > 1 && linha.charCodeAt(0) === 34) {
    const partes = linha.slice(1, -1).split(SEPARADOR);
    // Sem `esperado` não dá para saber se o rápido acertou, então ele vale; com
    // `esperado`, divergir manda para o cuidadoso.
    if (esperado === undefined || partes.length === esperado) return partes;
  }
  return colunasCuidadoso(linha);
}

function colunasCuidadoso(linha) {
  const saida = [];
  let atual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      // "" dentro de campo citado é uma aspa literal, não o fim do campo.
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
    } else if (ch === ";" && !dentroDeAspas) {
      saida.push(atual.trim());
      atual = "";
    } else {
      atual += ch;
    }
  }
  saida.push(atual.trim());
  return saida;
}

/** "AAAAMMDD" → "AAAA-MM-DD". "0" e "00000000" aparecem e significam vazio. */
export function dataReceita(v) {
  const d = apenasDigitos(v);
  if (d.length !== 8 || d.startsWith("0000")) return null;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

export function telefone(ddd, numero) {
  const d = apenasDigitos(ddd);
  const n = apenasDigitos(numero);
  return d && n ? `(${d}) ${n}` : null;
}

const CPF_NO_FIM = /\s+\d{11}$/;
const CNPJ_BASICO_NO_INICIO = /^\d{2}\.\d{3}\.\d{3}\s+/;

/**
 * Tira o dado pessoal que a Receita embute na razão social.
 *
 * Medido no arquivo real de 2026-07: **56,5%** das razões sociais terminam com
 * o CPF do titular (`"IRENILDA OLIVEIRA SILVA 11338767810"`) e 11,9% começam
 * com o CNPJ básico formatado (`"41.273.592 HELIO DE JESUS PEREIRA"`). MEI e
 * empresário individual são registrados assim.
 *
 * O CPF sai pelo mesmo motivo de `Socios.zip` não ser baixado: dado de empresa é
 * público, dado pessoal é outra coisa, e um CPF não ajuda a vender nada. O nome
 * fica — nesses casos a empresa **é** a pessoa, e sem ele não há como chamá-la.
 *
 * O CNPJ básico sai por ser ruído: já está na coluna `cnpj`.
 */
export function limparRazaoSocial(razao) {
  return (razao ?? "")
    .replace(CPF_NO_FIM, "")
    .replace(CNPJ_BASICO_NO_INICIO, "")
    .trim();
}
