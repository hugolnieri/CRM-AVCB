/**
 * Baixa e extrai os dados abertos do CNPJ da Receita Federal.
 *
 *     node scripts/baixar-receita.mjs
 *     node scripts/baixar-receita.mjs --dir ./receita --mes 2026-06
 *
 * Depois: node scripts/importar-receita.mjs --dir ./receita --camadas vizinhas
 *
 * Rode da SUA maquina, nao de um servidor: o portal da Receita recusa conexao
 * de IP de datacenter (e o motivo de o passo ser manual ate agora). Sao ~5 GB
 * compactados e ~17 GB extraidos, e a Receita nao e rapida -- conte com horas.
 * O script e retomavel: arquivo ja baixado por inteiro e pulado, entao pode
 * interromper e rodar de novo.
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

const BASE = "https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj";

// O navegador passa: sem User-Agent de gente o portal devolve 404.
const CABECALHOS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "*/*",
};

function argumentos() {
  const args = process.argv.slice(2);
  const opcoes = { dir: "./receita", mes: null };
  for (let i = 0; i < args.length; i += 2) {
    const chave = args[i]?.replace(/^--/, "");
    if (chave in opcoes) opcoes[chave] = args[i + 1];
  }
  return opcoes;
}

/** Os arquivos que o importador usa. Nada alem disso. */
function arquivosDoMes() {
  const lista = ["Municipios.zip"];
  for (let i = 0; i <= 9; i++) lista.push(`Empresas${i}.zip`, `Estabelecimentos${i}.zip`);
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

/**
 * Acha a pasta do mes mais recente que existe, andando para tras.
 *
 * A Receita publica com atraso variavel, entao o mes corrente costuma nao
 * existir ainda -- chutar so o mes atual daria 404 na maioria dos dias.
 */
async function descobrirMes() {
  const hoje = new Date();
  for (let atras = 0; atras < 12; atras++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - atras, 1);
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    process.stdout.write(`  procurando ${mes}... `);
    const tamanho = await tamanhoRemoto(`${BASE}/${mes}/Municipios.zip`);
    console.log(tamanho === null ? "nao" : "achei");
    if (tamanho !== null) return mes;
  }
  return null;
}

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

async function baixar(url, destino, esperado) {
  // Retomavel pelo caminho mais simples que existe: se o arquivo local ja tem
  // o tamanho anunciado, esta inteiro. Range/append daria um arquivo corrompido
  // silencioso se o servidor ignorasse o cabecalho.
  if (existsSync(destino) && esperado && statSync(destino).size === esperado) {
    console.log(`  ${path.basename(destino)} ja baixado (${mb(esperado)})`);
    return;
  }

  const r = await fetch(url, { headers: CABECALHOS });
  if (!r.ok) throw new Error(`${r.status} ao baixar ${url}`);

  const parcial = `${destino}.parcial`;
  await pipeline(Readable.fromWeb(r.body), createWriteStream(parcial));

  // So vira o arquivo final quando terminou: uma queda de conexao no meio
  // deixa .parcial, que a proxima rodada refaz, e nunca um zip truncado que o
  // importador leria como "arquivo corrompido".
  await rm(destino, { force: true });
  await rename(parcial, destino);
  console.log(`  ${path.basename(destino)} ok (${mb(statSync(destino).size)})`);
}

function extrair(zip, dir) {
  // `tar` do bsdtar le zip e vem no Windows 10+, macOS e Linux -- evita
  // dependencia so para descompactar.
  execFileSync("tar", ["-xf", zip, "-C", dir], { stdio: "inherit" });
}

async function main() {
  const { dir, mes: mesPedido } = argumentos();
  const destinoDir = path.resolve(dir);
  mkdirSync(destinoDir, { recursive: true });

  let mes = mesPedido;
  if (!mes) {
    console.log("Procurando o mes mais recente publicado...");
    mes = await descobrirMes();
    if (!mes) {
      console.error(
        "\nNao achei nenhuma pasta publicada. Se voce esta atras de proxy ou VPN,\n" +
          "desligue e tente de novo, ou abra no navegador e passe --mes AAAA-MM:\n" +
          `  ${BASE}/`,
      );
      process.exit(1);
    }
  }

  console.log(`\nMes: ${mes}`);
  console.log(`Pasta: ${destinoDir}\n`);

  const lista = arquivosDoMes();
  let baixados = 0;

  for (const nome of lista) {
    const url = `${BASE}/${mes}/${nome}`;
    const esperado = await tamanhoRemoto(url);
    if (esperado === null) {
      // Alguns meses tem menos de 10 partes. Ausencia nao e erro.
      console.log(`  ${nome} nao existe neste mes, pulando`);
      continue;
    }
    await baixar(url, path.join(destinoDir, nome), esperado);
    baixados++;
  }

  console.log(`\nExtraindo ${baixados} arquivos...`);
  for (const zip of readdirSync(destinoDir).filter((f) => f.endsWith(".zip"))) {
    process.stdout.write(`  ${zip}... `);
    extrair(path.join(destinoDir, zip), destinoDir);
    console.log("ok");
  }

  console.log(
    `\nPronto. Agora:\n` +
      `  node scripts/importar-receita.mjs --dir ${dir} --camadas vizinhas --limite 200\n`,
  );
}

main().catch((err) => {
  console.error(`\nErro: ${err.message}`);
  process.exit(1);
});
