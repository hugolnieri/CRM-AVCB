/**
 * Baixa e extrai os dados abertos do CNPJ da Receita Federal.
 *
 *     node scripts/baixar-receita.mjs
 *     node scripts/baixar-receita.mjs --dir ./receita --mes 2026-07
 *     node scripts/baixar-receita.mjs --partes 0,1        (so um pedaco, para testar)
 *
 * Depois: node scripts/importar-receita.mjs --dir ./receita --camadas vizinhas
 *
 * O portal virou um Nextcloud: `dadosabertos.rfb.gov.br` esta fora do ar e as
 * URLs planas antigas (`/dados/cnpj/dados_abertos_cnpj/AAAA-MM/`) devolvem 404.
 * O caminho vivo e o compartilhamento publico abaixo, servido por WebDAV, com o
 * token como usuario e senha vazia. Funciona de qualquer lugar, inclusive de
 * servidor -- foi verificado baixando Municipios.zip inteiro.
 *
 * Sao ~26 GB compactados no total; so Estabelecimentos + Empresas + Municipios,
 * que e o que o importador usa, dao ~7 GB. Conte com uma hora larga.
 * O script e retomavel: arquivo ja baixado por inteiro e pulado.
 *
 * `Socios*.zip` NAO entra na lista de proposito: traz nome e CPF de pessoas
 * fisicas. Dado de empresa e publico; dado de socio e dado pessoal, e nao tem
 * por que entrar num CRM de prospeccao.
 */
import { createWriteStream, existsSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const TOKEN = "gn672Ad4CF8N6TK";
const BASE = `https://arquivos.receitafederal.gov.br/public.php/dav/files/${TOKEN}/Dados/Cadastros/CNPJ`;

const CABECALHOS = {
  // O token do compartilhamento publico vai como usuario, com senha vazia.
  Authorization: `Basic ${Buffer.from(`${TOKEN}:`).toString("base64")}`,
  "User-Agent": "CRM-SEICO/1.0 (prospeccao interna)",
};

function argumentos() {
  const args = process.argv.slice(2);
  const opcoes = { dir: "./receita", mes: null, partes: null };
  for (let i = 0; i < args.length; i += 2) {
    const chave = args[i]?.replace(/^--/, "");
    if (chave in opcoes) opcoes[chave] = args[i + 1];
  }
  return opcoes;
}

/** PROPFIND de profundidade 1: os nomes que existem sob `caminho`. */
async function listar(caminho) {
  const r = await fetch(`${BASE}/${caminho}`, {
    method: "PROPFIND",
    headers: { ...CABECALHOS, Depth: "1" },
  });
  if (!r.ok) throw new Error(`${r.status} ao listar ${caminho || "/"}`);
  const xml = await r.text();
  const nomes = [...xml.matchAll(/<d:href>([^<]*)<\/d:href>/g)]
    .map((m) => decodeURIComponent(m[1]))
    .map((href) => href.replace(/\/$/, "").split("/").pop());
  return [...new Set(nomes)].filter(Boolean);
}

/**
 * Os arquivos que o importador usa. `Socios`, `Simples`, `Naturezas` e o resto
 * ficam de fora: nao entram na decisao de prospectar, e sao GB a toa.
 */
function arquivosDoMes(partes) {
  const lista = ["Municipios.zip"];
  for (const i of partes) lista.push(`Empresas${i}.zip`, `Estabelecimentos${i}.zip`);
  return lista;
}

async function tamanhoRemoto(url) {
  try {
    const r = await fetch(url, { method: "HEAD", headers: CABECALHOS });
    if (!r.ok) return null;
    const len = r.headers.get("content-length");
    return len ? Number(len) : 0;
  } catch {
    return null;
  }
}

function gb(bytes) {
  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
    : `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

async function baixar(url, destino, esperado) {
  // Retomavel pelo caminho mais simples que existe: se o arquivo local ja tem o
  // tamanho anunciado, esta inteiro. Range/append daria um arquivo corrompido
  // em silencio se o servidor ignorasse o cabecalho.
  if (existsSync(destino) && esperado && statSync(destino).size === esperado) {
    console.log(`  ${path.basename(destino)} ja baixado (${gb(esperado)})`);
    return;
  }

  process.stdout.write(`  ${path.basename(destino)} (${gb(esperado)})... `);
  const r = await fetch(url, { headers: CABECALHOS });
  if (!r.ok) throw new Error(`${r.status} ao baixar ${url}`);

  const parcial = `${destino}.parcial`;
  await pipeline(Readable.fromWeb(r.body), createWriteStream(parcial));

  // So vira o arquivo final quando terminou: uma queda de conexao no meio
  // deixa .parcial, que a proxima rodada refaz, e nunca um zip truncado que o
  // importador leria como "arquivo corrompido".
  await rm(destino, { force: true });
  await rename(parcial, destino);
  console.log("ok");
}

function extrair(zip, dir) {
  // bsdtar le zip e vem no Windows 10+, macOS e Linux. O `tar` do Git Bash e o
  // GNU, que NAO le zip -- por isso o caminho absoluto no Windows.
  const bsdtar =
    process.platform === "win32" && existsSync("C:/Windows/System32/tar.exe")
      ? "C:/Windows/System32/tar.exe"
      : "tar";
  execFileSync(bsdtar, ["-xf", zip, "-C", dir], { stdio: "inherit" });
}

async function main() {
  const opcoes = argumentos();
  const destinoDir = path.resolve(opcoes.dir);
  mkdirSync(destinoDir, { recursive: true });

  let mes = opcoes.mes;
  if (!mes) {
    process.stdout.write("Procurando o mes mais recente... ");
    const pastas = (await listar("")).filter((n) => /^\d{4}-\d{2}$/.test(n)).sort();
    mes = pastas.at(-1);
    if (!mes) throw new Error("nenhuma pasta AAAA-MM no compartilhamento");
    console.log(mes);
  }

  // Os 10 pedacos sao uma reparticao arbitraria do cadastro, nao um recorte
  // geografico: cada um traz empresas do Brasil inteiro. Para um teste rapido,
  // --partes 0 ja da uma amostra representativa da regiao.
  const partes = opcoes.partes
    ? opcoes.partes.split(",").map((p) => p.trim())
    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  console.log(`Pasta:  ${destinoDir}`);
  console.log(`Partes: ${partes.join(", ")}\n`);

  for (const nome of arquivosDoMes(partes)) {
    const url = `${BASE}/${mes}/${nome}`;
    const esperado = await tamanhoRemoto(url);
    if (esperado === null) {
      console.log(`  ${nome} nao existe neste mes, pulando`);
      continue;
    }
    await baixar(url, path.join(destinoDir, nome), esperado);
  }

  console.log("\nExtraindo...");
  for (const zip of readdirSync(destinoDir).filter((f) => f.endsWith(".zip"))) {
    process.stdout.write(`  ${zip}... `);
    extrair(path.join(destinoDir, zip), destinoDir);
    console.log("ok");
  }

  console.log(
    `\nPronto. Agora:\n` +
      `  node scripts/importar-receita.mjs --dir ${opcoes.dir} --camadas vizinhas\n`,
  );
}

main().catch((err) => {
  console.error(`\nErro: ${err.message}`);
  process.exit(1);
});
