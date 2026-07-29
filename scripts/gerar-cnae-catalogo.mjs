/**
 * Gera lib/cnaeCatalogo.ts a partir da API pública do IBGE.
 *
 *     node scripts/gerar-cnae-catalogo.mjs
 *
 * O catálogo é commitado, e não buscado em tempo de execução, por dois motivos:
 * a tabela CNAE muda de década em década, e uma tela de cadastro não pode
 * depender de o IBGE estar no ar para deixar alguém salvar um lead.
 *
 * Ficam de fora as subclasses (1.332 itens, ~3,6 MB de resposta): para casar
 * serviço com ramo de atividade, classe já é granular demais em vários casos —
 * e o casamento é por prefixo, então uma subclasse informada no lead cai
 * naturalmente sob a classe dela.
 */
import { writeFileSync } from "node:fs";

const IBGE = "https://servicodados.ibge.gov.br/api/v2/cnae";

/** Preposições e artigos ficam minúsculos no meio do nome. */
const MENORES = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas",
  "a", "o", "as", "os", "para", "com", "por", "ao", "aos", "sob", "sobre",
  "entre", "ou", "sem",
]);

/** Única sigla que aparece na base — verificado varrendo as descrições. */
const SIGLAS = new Set(["GLP"]);

function caixaDeTitulo(texto) {
  const palavras = texto.trim().split(/\s+/);
  return palavras
    .map((palavra, indice) => {
      // Hífen compõe uma palavra só ("semi-acabados"), tratada peça por peça.
      return palavra
        .split("-")
        .map((peca, pedaco) => {
          if (SIGLAS.has(peca)) return peca;
          const minuscula = peca.toLocaleLowerCase("pt-BR");
          // Preposição fica minúscula em qualquer posição — inclusive depois de
          // hífen, senão "cana-de-açúcar" vira "Cana-De-Açúcar". A única
          // exceção é a primeiríssima palavra do nome.
          const primeiraDeTodas = indice === 0 && pedaco === 0;
          if (!primeiraDeTodas && MENORES.has(minuscula)) return minuscula;
          return minuscula.replace(/^[\p{L}]/u, (c) => c.toLocaleUpperCase("pt-BR"));
        })
        .join("-");
    })
    .join(" ");
}

async function buscar(caminho) {
  const resposta = await fetch(`${IBGE}/${caminho}`, {
    headers: { "User-Agent": "SEICO-CRM/1.0" },
  });
  if (!resposta.ok) throw new Error(`IBGE ${caminho}: HTTP ${resposta.status}`);
  return resposta.json();
}

const [divisoes, classes] = await Promise.all([buscar("divisoes"), buscar("classes")]);

const entradas = [
  ...divisoes.map((d) => [d.id.replace(/\D/g, ""), caixaDeTitulo(d.descricao)]),
  ...classes.map((c) => [c.id.replace(/\D/g, ""), caixaDeTitulo(c.descricao)]),
].sort((a, b) => a[0].localeCompare(b[0]));

const linhas = entradas.map(([codigo, descricao]) => {
  const escapada = descricao.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `  ["${codigo}", "${escapada}"],`;
});

const conteudo = `// GERADO por scripts/gerar-cnae-catalogo.mjs — não edite à mão.
// Fonte: IBGE, https://servicodados.ibge.gov.br/api/v2/cnae
// ${divisoes.length} divisões (2 dígitos) + ${classes.length} classes (5 dígitos, com verificador).

/** \`[código só com dígitos, descrição]\`. 2 dígitos = divisão; 5 = classe. */
export type EntradaCnae = readonly [codigo: string, descricao: string];

export const CNAE_CATALOGO: readonly EntradaCnae[] = [
${linhas.join("\n")}
];
`;

writeFileSync(new URL("../lib/cnaeCatalogo.ts", import.meta.url), conteudo, "utf8");

console.log(
  `lib/cnaeCatalogo.ts: ${entradas.length} entradas (${divisoes.length} divisões + ${classes.length} classes), ${(conteudo.length / 1024).toFixed(1)} KB`,
);
