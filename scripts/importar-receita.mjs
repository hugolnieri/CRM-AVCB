/**
 * Filtra os dados abertos do CNPJ da Receita Federal e produz um arquivo de
 * prospecção pronto para a tela de importação do CRM.
 *
 *     node scripts/importar-receita.mjs --dir ./receita --camadas vizinhas
 *     node scripts/importar-receita.mjs --dir ./receita --camadas vizinhas,sorocaba --cnaes 41,42,43,10
 *
 * Os arquivos vêm de `scripts/baixar-receita.mjs`, que já traz só o necessário:
 *
 *   Estabelecimentos0..9.zip   endereço, CNAE, situação, telefone
 *   Empresas0..9.zip           razão social, porte, capital social
 *   Municipios.zip             código TOM -> nome da cidade
 *
 * `Socios*.zip` fica fora de propósito: traz nome e CPF de pessoas físicas.
 * Dado de empresa é público; dado de sócio é dado pessoal, e não tem por que
 * entrar num CRM de prospecção.
 *
 * As posições abaixo foram conferidas contra o arquivo real de 2026-07
 * (Estabelecimentos: 30 colunas; Empresas: 7). O script revalida a contagem a
 * cada linha e aborta com mensagem clara se a Receita mudar o layout.
 */
import { createReadStream, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

// --- posições no CSV (0-based), conforme o dicionário da Receita -------------

const ESTAB = {
  COLUNAS: 30,
  CNPJ_BASICO: 0,
  CNPJ_ORDEM: 1,
  CNPJ_DV: 2,
  MATRIZ_FILIAL: 3, // "1" = matriz
  NOME_FANTASIA: 4,
  SITUACAO: 5, // "02" = ativa
  CNAE_PRINCIPAL: 11,
  TIPO_LOGRADOURO: 13,
  LOGRADOURO: 14,
  NUMERO: 15,
  COMPLEMENTO: 16,
  BAIRRO: 17,
  CEP: 18,
  UF: 19,
  MUNICIPIO: 20, // código TOM, não IBGE
  DDD1: 21,
  TELEFONE1: 22,
  EMAIL: 27,
};

const EMPRESA = {
  COLUNAS: 7,
  CNPJ_BASICO: 0,
  RAZAO_SOCIAL: 1,
  CAPITAL_SOCIAL: 4,
  PORTE: 5, // "01" MEI/ME, "03" EPP, "05" demais
};

const PORTE_LABEL = { "01": "Micro", "03": "Pequeno", "05": "Demais" };

// --- argumentos --------------------------------------------------------------

/**
 * Percorre argv em pares, e nao divide a linha inteira em "--": um caminho como
 * `.../c--Meus-Apps/receita` contem dois hifens no meio e seria partido ao
 * meio. Descoberto rodando o script contra dados sinteticos numa pasta assim.
 */
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const token = process.argv[i];
  if (!token.startsWith("--")) continue;
  const chave = token.slice(2);
  const proximo = process.argv[i + 1];
  args[chave] = proximo && !proximo.startsWith("--") ? proximo : "true";
  if (args[chave] !== "true") i++;
}

const dir = args.dir ?? "./receita";
const camadas = (args.camadas ?? "vizinhas").split(",").map((c) => c.trim());
const cnaesFiltro = (args.cnaes ?? "").split(",").map((c) => c.replace(/\D/g, "")).filter(Boolean);
const limite = args.limite ? Number(args.limite) : Infinity;
const saida = args.saida ?? "./prospeccao.json";

// Espelha lib/regiao.ts. Duplicado de propósito: este script roda fora do
// bundle do Next e não deve arrastar o alias "@/" nem o resto do app.
const CAMADAS = {
  vizinhas: ["Cerquilho", "Tietê", "Jumirim", "Boituva", "Cesário Lange", "Laranjal Paulista", "Tatuí"],
  sorocaba: ["Sorocaba", "Votorantim", "Itu", "Salto", "Porto Feliz", "Capela do Alto", "Iperó",
    "Araçoiaba da Serra", "Alumínio", "Mairinque", "Araçariguama", "São Roque", "Salto de Pirapora", "Sarapuí"],
  ampliada: ["Itapetininga", "Piedade", "Pilar do Sul", "Ibiúna", "Conchas", "Pereiras", "Porangaba",
    "Quadra", "Torre de Pedra", "Anhembi", "Bofete", "Guareí", "Alambari", "Capão Bonito", "Angatuba",
    "Piracicaba", "Rio das Pedras", "Saltinho", "Elias Fausto", "Capivari", "Monte Mor", "Indaiatuba"],
};

// O intervalo de marcas combinantes fica escapado dentro de uma string, e o
// RegExp e construido a partir dela: um literal com os caracteres crus se
// corrompe em qualquer re-save que nao seja UTF-8, e o bug e silencioso.
// Mesma cautela de lib/search.ts.
const MARCAS = new RegExp("[\u0300-\u036f]", "g");
const normalizar = (t) =>
  t.normalize("NFD").replace(MARCAS, "").toLowerCase().trim();

const cidadesAlvo = new Map(
  camadas.flatMap((c) => CAMADAS[c] ?? []).map((nome) => [normalizar(nome), nome]),
);

if (cidadesAlvo.size === 0) {
  console.error(`Camada desconhecida: ${camadas.join(",")}. Use vizinhas, sorocaba ou ampliada.`);
  process.exit(1);
}

// --- leitura -----------------------------------------------------------------

function arquivosQueCasam(padrao) {
  let conteudo;
  try {
    conteudo = readdirSync(dir);
  } catch {
    console.error(`Pasta nao encontrada: ${dir}`);
    console.error("Use --dir para apontar onde os arquivos da Receita foram descompactados.");
    process.exit(1);
  }
  const encontrados = conteudo.filter((f) => padrao.test(f));
  if (encontrados.length === 0) {
    console.error(`Nenhum arquivo casando com ${padrao} em ${dir}.`);
    console.error("Descompacte os .zip da Receita nessa pasta antes de rodar.");
    process.exit(1);
  }
  return encontrados.map((f) => path.join(dir, f));
}

/**
 * Os CSVs da Receita são `;`-separados, com aspas, e em **latin1** — lê-los
 * como UTF-8 transforma todo "SÃO" em "S?O" silenciosamente.
 */
function linhas(arquivo) {
  return createInterface({
    input: createReadStream(arquivo, { encoding: "latin1" }),
    crlfDelay: Infinity,
  });
}

function campos(linha) {
  return linha.split(";").map((c) => c.replace(/^"|"$/g, "").trim());
}

// --- 1. municípios: código TOM -> nome ---------------------------------------

console.log(`Cidades-alvo (${cidadesAlvo.size}): ${[...cidadesAlvo.values()].join(", ")}\n`);

const codigoParaCidade = new Map();
for (const arquivo of arquivosQueCasam(/MUNIC|Municipios/i)) {
  for await (const linha of linhas(arquivo)) {
    const c = campos(linha);
    if (c.length < 2) continue;
    const nome = cidadesAlvo.get(normalizar(c[1]));
    if (nome) codigoParaCidade.set(c[0], nome);
  }
}

if (codigoParaCidade.size === 0) {
  console.error("Nenhuma cidade-alvo encontrada no arquivo de municípios.");
  console.error("Confira se o arquivo descompactado é o Municipios da Receita.");
  process.exit(1);
}
console.log(`Municípios casados: ${codigoParaCidade.size} de ${cidadesAlvo.size}\n`);

// --- 2. estabelecimentos: o filtro pesado ------------------------------------

const selecionados = new Map(); // cnpj básico -> registro
let lidas = 0;
let colunasVistas = 0;

for (const arquivo of arquivosQueCasam(/ESTABELE/i)) {
  process.stdout.write(`lendo ${path.basename(arquivo)}… `);
  let doArquivo = 0;

  for await (const linha of linhas(arquivo)) {
    lidas++;
    const c = campos(linha);
    if (c.length < ESTAB.COLUNAS - 2) continue;
    colunasVistas = Math.max(colunasVistas, c.length);

    if (c[ESTAB.SITUACAO] !== "02") continue; // só ativa
    const cidade = codigoParaCidade.get(c[ESTAB.MUNICIPIO]);
    if (!cidade) continue;

    const cnae = (c[ESTAB.CNAE_PRINCIPAL] ?? "").replace(/\D/g, "");
    if (cnaesFiltro.length > 0 && !cnaesFiltro.some((p) => cnae.startsWith(p))) continue;

    const basico = c[ESTAB.CNPJ_BASICO];
    const ddd = c[ESTAB.DDD1];
    const fone = c[ESTAB.TELEFONE1];

    selecionados.set(basico, {
      cnpj: `${basico}${c[ESTAB.CNPJ_ORDEM]}${c[ESTAB.CNPJ_DV]}`,
      nomeFantasia: c[ESTAB.NOME_FANTASIA] || null,
      matriz: c[ESTAB.MATRIZ_FILIAL] === "1",
      cnae,
      endereco: [c[ESTAB.TIPO_LOGRADOURO], c[ESTAB.LOGRADOURO], c[ESTAB.NUMERO]]
        .filter(Boolean)
        .join(" ")
        .trim() || null,
      bairro: c[ESTAB.BAIRRO] || null,
      cep: c[ESTAB.CEP] || null,
      cidade,
      uf: c[ESTAB.UF] || "SP",
      telefone: ddd && fone ? `(${ddd}) ${fone}` : null,
      email: (c[ESTAB.EMAIL] || "").toLowerCase() || null,
    });

    doArquivo++;
    if (selecionados.size >= limite) break;
  }

  console.log(`${doArquivo} selecionados (acumulado ${selecionados.size})`);
  if (selecionados.size >= limite) break;
}

if (selecionados.size === 0) {
  console.error(`\nNenhum estabelecimento selecionado em ${lidas} linhas lidas.`);
  console.error(`Maior contagem de colunas vista: ${colunasVistas} (esperado ~${ESTAB.COLUNAS}).`);
  console.error("Se divergir muito, o layout mudou — confira o dicionário de dados da Receita.");
  process.exit(1);
}

// --- 3. empresas: razão social e porte ---------------------------------------

console.log(`\nBuscando razão social de ${selecionados.size} empresas…`);
let casadas = 0;

for (const arquivo of arquivosQueCasam(/EMPRE/i)) {
  for await (const linha of linhas(arquivo)) {
    const c = campos(linha);
    if (c.length < EMPRESA.COLUNAS - 2) continue;
    const registro = selecionados.get(c[EMPRESA.CNPJ_BASICO]);
    if (!registro) continue;

    registro.razaoSocial = c[EMPRESA.RAZAO_SOCIAL] || null;
    registro.porte = PORTE_LABEL[c[EMPRESA.PORTE]] ?? null;
    registro.capitalSocial = Number((c[EMPRESA.CAPITAL_SOCIAL] || "0").replace(",", ".")) || 0;
    casadas++;
  }
}

// --- 4. saída ----------------------------------------------------------------

const registros = [...selecionados.values()]
  .filter((r) => r.razaoSocial)
  // Maior capital primeiro: é o proxy de porte disponível na base, e quem
  // trabalha a lista de cima para baixo aproveita mais o dia.
  .sort((a, b) => (b.capitalSocial ?? 0) - (a.capitalSocial ?? 0));

writeFileSync(
  saida,
  JSON.stringify(
    {
      geradoEm: new Date().toISOString(),
      camadas,
      cnaes: cnaesFiltro,
      total: registros.length,
      registros,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`
${registros.length} empresas gravadas em ${saida}
  linhas lidas       ${lidas.toLocaleString("pt-BR")}
  com razão social   ${casadas}
  sem razão social   ${selecionados.size - casadas} (descartadas)

Abra o CRM em Leads > Importar e escolha este arquivo.`);
