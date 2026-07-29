/**
 * Levanta as empresas da regiao a partir do dump do CNPJ e grava em
 * `public.prospeccao`. E o que o GitHub Actions roda todo mes.
 *
 *     node scripts/prospectar.mjs --camadas vizinhas
 *     node scripts/prospectar.mjs --camadas vizinhas,sorocaba --partes 0
 *     node scripts/prospectar.mjs --camadas vizinhas --seco     (nao grava)
 *
 * Variaveis de ambiente:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   PROSPECCAO_BOT_EMAIL, PROSPECCAO_BOT_SENHA
 *
 * NAO usa a service role. A conta do robo e um usuario comum: se o segredo
 * vazar, o estrago e o de um colaborador, nao o de quem ignora RLS. O
 * repositorio e publico, entao essa diferenca e a diferenca inteira.
 *
 * Nada e gravado em disco. Cada zip da Receita tem UMA entrada deflate, entao
 * da para inflar a resposta HTTP em fluxo e ler linha a linha -- sao 27 GB, e
 * nenhum runner de CI tem espaco para eles.
 *
 * `Socios*.zip` nao e tocado: nome e CPF de pessoa fisica nao entram aqui.
 */
import { createInterface } from "node:readline";
import { Readable, Transform } from "node:stream";
import zlib from "node:zlib";
import { createClient } from "@supabase/supabase-js";
import { CAMADAS, cidadesDasCamadas } from "./regiao.mjs";
import {
  apenasDigitos,
  aspasFechadas,
  colunas,
  dataReceita,
  limparRazaoSocial,
  normalizar,
  telefone,
} from "./receita.mjs";

const TOKEN = "gn672Ad4CF8N6TK";
const BASE = `https://arquivos.receitafederal.gov.br/public.php/dav/files/${TOKEN}/Dados/Cadastros/CNPJ`;
const CABECALHOS = {
  Authorization: `Basic ${Buffer.from(`${TOKEN}:`).toString("base64")}`,
  "User-Agent": "CRM-SEICO/1.0 (prospeccao interna)",
};

// Posicoes conferidas contra o arquivo real de 2026-07.
const ESTAB = {
  COLUNAS: 30,
  CNPJ_BASICO: 0,
  CNPJ_ORDEM: 1,
  CNPJ_DV: 2,
  MATRIZ_FILIAL: 3,
  NOME_FANTASIA: 4,
  SITUACAO: 5,
  INICIO_ATIVIDADE: 10,
  CNAE_PRINCIPAL: 11,
  TIPO_LOGRADOURO: 13,
  LOGRADOURO: 14,
  NUMERO: 15,
  COMPLEMENTO: 16,
  BAIRRO: 17,
  CEP: 18,
  UF: 19,
  MUNICIPIO: 20,
  DDD1: 21,
  TELEFONE1: 22,
  EMAIL: 27,
};

const EMPRESA = { COLUNAS: 7, CNPJ_BASICO: 0, RAZAO_SOCIAL: 1, CAPITAL_SOCIAL: 4, PORTE: 5 };

function argumentos() {
  const args = process.argv.slice(2);
  const o = { camadas: "vizinhas", partes: null, mes: null, seco: false };
  for (let i = 0; i < args.length; i++) {
    const chave = args[i]?.replace(/^--/, "");
    if (chave === "seco") o.seco = true;
    else if (chave in o) o[chave] = args[++i];
  }
  return o;
}

// --- leitura em fluxo --------------------------------------------------------

/**
 * Remove o local file header do zip e devolve o resto para o inflate.
 *
 * Vale porque cada arquivo da Receita e um zip de UMA entrada. Um zip com
 * varias precisaria de biblioteca; este nao precisa, e evitar a dependencia
 * evita o download em disco que ela imporia.
 */
function tiraCabecalhoZip() {
  let restante = Buffer.alloc(0);
  let pronto = false;

  return new Transform({
    transform(chunk, _enc, cb) {
      if (pronto) return cb(null, chunk);

      restante = Buffer.concat([restante, chunk]);
      if (restante.length < 30) return cb();

      if (restante.readUInt32LE(0) !== 0x04034b50) {
        return cb(new Error("nao e um zip (assinatura ausente)"));
      }
      if (restante.readUInt16LE(8) !== 8) {
        return cb(new Error("entrada nao esta em deflate"));
      }

      const inicio = 30 + restante.readUInt16LE(26) + restante.readUInt16LE(28);
      if (restante.length < inicio) return cb();

      pronto = true;
      cb(null, restante.subarray(inicio));
    },
  });
}

/** Um registro pode ocupar mais de uma linha; acima disso e lixo, nao campo. */
const MAX_REGISTRO = 8192;

/**
 * Registros do CSV de dentro de um zip remoto, sem passar por disco.
 *
 * Duas coisas que o arquivo real ensinou e o sintetico nunca ensinaria:
 *
 * 1. latin1 e obrigatorio. Lido como UTF-8, todo "SAO" vira "S?O" em silencio,
 *    porque os bytes sao validos e so o resultado esta errado.
 * 2. Um registro NAO e uma linha. Alguns campos citados contem quebra de linha
 *    de verdade, entao a leitura acumula ate as aspas fecharem. Sem isso o
 *    registro seguinte chega picado e a conferencia de layout derruba a coleta
 *    inteira por causa de um endereco mal digitado em 2003.
 */
async function* registros(url) {
  const r = await fetch(url, { headers: CABECALHOS });
  if (!r.ok) throw new Error(`${r.status} ao abrir ${url}`);

  const fluxo = Readable.fromWeb(r.body).pipe(tiraCabecalhoZip()).pipe(zlib.createInflateRaw());
  fluxo.setEncoding("latin1");

  const rl = createInterface({ input: fluxo, crlfDelay: Infinity });
  let acumulado = "";

  for await (const linha of rl) {
    acumulado = acumulado ? `${acumulado} ${linha}` : linha;
    if (!acumulado) continue;

    if (aspasFechadas(acumulado) || acumulado.length > MAX_REGISTRO) {
      yield acumulado;
      acumulado = "";
    }
  }
  if (acumulado) yield acumulado;
}

async function mesMaisRecente() {
  const r = await fetch(BASE, { method: "PROPFIND", headers: { ...CABECALHOS, Depth: "1" } });
  if (!r.ok) throw new Error(`${r.status} ao listar as competencias`);
  const xml = await r.text();
  const meses = [...xml.matchAll(/CNPJ\/(\d{4}-\d{2})\//g)].map((m) => m[1]);
  return [...new Set(meses)].sort().at(-1);
}

// --- passos ------------------------------------------------------------------

/**
 * Codigo TOM -> nome da cidade, so para as cidades-alvo.
 *
 * A Receita usa a tabela TOM, NAO o codigo do IBGE (Cerquilho e 6331 la e
 * 3512001 no IBGE). Confundir as duas e o erro classico deste import, entao o
 * casamento e por nome normalizado.
 */
async function mapaDeMunicipios(url, alvo) {
  const porNome = new Map(alvo.map((c) => [normalizar(c), c]));
  const porCodigo = new Map();

  for await (const linha of registros(url)) {
    const [codigo, nome] = colunas(linha);
    const oficial = porNome.get(normalizar(nome));
    if (oficial) porCodigo.set(codigo, oficial);
  }
  return porCodigo;
}

function casaCnae(cnae, prefixos) {
  if (prefixos.length === 0) return true;
  const d = apenasDigitos(cnae);
  return prefixos.some((p) => d.startsWith(p));
}

async function coletarEstabelecimentos(mes, partes, municipios, prefixos) {
  const achados = new Map(); // cnpjBasico -> registro[]

  for (const parte of partes) {
    const url = `${BASE}/${mes}/Estabelecimentos${parte}.zip`;
    process.stdout.write(`  Estabelecimentos${parte}... `);
    let lidas = 0;
    let pegas = 0;
    let malformadas = 0;

    for await (const linha of registros(url)) {
      lidas++;
      const c = colunas(linha, ESTAB.COLUNAS);
      if (c.length !== ESTAB.COLUNAS) {
        // Registro sujo se pula; layout trocado se aborta. A diferenca e a
        // proporcao: um endereco maldigitado em 2003 e um caso em milhoes, uma
        // coluna nova da Receita e todos eles.
        malformadas++;
        if (malformadas > 100 && malformadas > lidas * 0.001) {
          throw new Error(
            `layout de Estabelecimentos mudou: ${malformadas} de ${lidas} registros nao dao ` +
              `${ESTAB.COLUNAS} colunas (o ultimo deu ${c.length}). Confira o dicionario da Receita.`,
          );
        }
        continue;
      }

      const cidade = municipios.get(c[ESTAB.MUNICIPIO]);
      if (!cidade) continue;
      if (c[ESTAB.SITUACAO] !== "02") continue; // so ativas
      if (!casaCnae(c[ESTAB.CNAE_PRINCIPAL], prefixos)) continue;

      const cnpjBasico = c[ESTAB.CNPJ_BASICO];
      const registro = {
        cnpj: `${cnpjBasico}${c[ESTAB.CNPJ_ORDEM]}${c[ESTAB.CNPJ_DV]}`,
        nome_fantasia: c[ESTAB.NOME_FANTASIA] || null,
        matriz: c[ESTAB.MATRIZ_FILIAL] === "1",
        cnae: apenasDigitos(c[ESTAB.CNAE_PRINCIPAL]),
        endereco:
          [c[ESTAB.TIPO_LOGRADOURO], c[ESTAB.LOGRADOURO], c[ESTAB.NUMERO]]
            .filter(Boolean)
            .join(" ") || null,
        bairro: c[ESTAB.BAIRRO] || null,
        cep: apenasDigitos(c[ESTAB.CEP]) || null,
        cidade,
        uf: c[ESTAB.UF],
        telefone: telefone(c[ESTAB.DDD1], c[ESTAB.TELEFONE1]),
        email: c[ESTAB.EMAIL]?.toLowerCase() || null,
        inicio_atividade: dataReceita(c[ESTAB.INICIO_ATIVIDADE]),
        competencia: mes,
      };

      if (!achados.has(cnpjBasico)) achados.set(cnpjBasico, []);
      achados.get(cnpjBasico).push(registro);
      pegas++;
    }
    console.log(`${lidas.toLocaleString("pt-BR")} linhas, ${pegas} na regiao`);
  }
  return achados;
}

/** Razao social, porte e capital vem do outro arquivo, ligados pelo CNPJ basico. */
async function completarComEmpresas(mes, partes, achados) {
  let completados = 0;

  for (const parte of partes) {
    if (achados.size === completados) break;
    const url = `${BASE}/${mes}/Empresas${parte}.zip`;
    process.stdout.write(`  Empresas${parte}... `);

    for await (const linha of registros(url)) {
      const c = colunas(linha, EMPRESA.COLUNAS);
      // Registro sujo se pula, pelo mesmo motivo de Estabelecimentos. Aqui nem
      // precisa de teto: sem razao social a linha e descartada no fim de
      // qualquer jeito, entao um layout trocado aparece como "0 identificadas".
      if (c.length !== EMPRESA.COLUNAS) continue;

      const alvos = achados.get(c[EMPRESA.CNPJ_BASICO]);
      if (!alvos) continue;

      for (const r of alvos) {
        // Tira o CPF do titular, que a Receita embute na razao social de MEI e
        // empresario individual -- 56,5% das linhas do arquivo real. Dado de
        // empresa e publico; CPF de pessoa fisica e outra coisa, e nao ajuda a
        // vender nada. Mesmo motivo de Socios.zip nao ser baixado.
        r.razao_social = limparRazaoSocial(c[EMPRESA.RAZAO_SOCIAL]);
        r.porte = c[EMPRESA.PORTE] || null;
        // "5000,00" -- virgula decimal, do jeito que a Receita escreve.
        r.capital_social = Number(String(c[EMPRESA.CAPITAL_SOCIAL]).replace(",", ".")) || null;
      }
      completados++;
    }
    console.log(`${completados} de ${achados.size} identificadas`);
  }
}

// --- gravacao ----------------------------------------------------------------

async function entrar() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.PROSPECCAO_BOT_EMAIL;
  const senha = process.env.PROSPECCAO_BOT_SENHA;

  if (!url || !anon) throw new Error("faltam NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY");
  if (!email || !senha) throw new Error("faltam PROSPECCAO_BOT_EMAIL / PROSPECCAO_BOT_SENHA");

  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(`login do robo recusado: ${error.message}`);
  return supabase;
}

async function prefixosDoCatalogo(supabase) {
  const { data, error } = await supabase.from("tipos_servico").select("cnaes").eq("ativo", true);
  if (error) throw error;
  const prefixos = (data ?? []).flatMap((t) => t.cnaes ?? []).map(apenasDigitos).filter(Boolean);
  return [...new Set(prefixos)];
}

async function gravar(supabase, registros) {
  const LOTE = 500;
  let gravados = 0;

  for (let i = 0; i < registros.length; i += LOTE) {
    const lote = registros.slice(i, i + LOTE);
    // onConflict no CNPJ: rodar duas vezes o mesmo mes atualiza, nao duplica.
    // `virou_lead_em` e `descartada_em` nao estao no payload, entao a decisao
    // ja tomada sobrevive a coleta seguinte -- que e o ponto.
    const { error } = await supabase
      .from("prospeccao")
      .upsert(lote, { onConflict: "cnpj", ignoreDuplicates: false });
    if (error) throw error;
    gravados += lote.length;
    process.stdout.write(`\r  gravados ${gravados}/${registros.length}`);
  }
  console.log();
}

// --- principal ---------------------------------------------------------------

async function main() {
  const o = argumentos();
  const ids = o.camadas.split(",").map((c) => c.trim());
  const desconhecida = ids.find((id) => !CAMADAS.some((c) => c.id === id));
  if (desconhecida) {
    throw new Error(`camada "${desconhecida}". Conhecidas: ${CAMADAS.map((c) => c.id).join(", ")}`);
  }

  const cidades = cidadesDasCamadas(ids);
  const partes = o.partes ? o.partes.split(",").map((p) => p.trim()) : [...Array(10).keys()];
  const mes = o.mes ?? (await mesMaisRecente());

  console.log(`Competencia: ${mes}`);
  console.log(`Cidades (${cidades.length}): ${cidades.join(", ")}`);
  console.log(`Partes: ${partes.join(", ")}\n`);

  const supabase = o.seco ? null : await entrar();
  const prefixos = supabase ? await prefixosDoCatalogo(supabase) : [];

  if (supabase && prefixos.length === 0) {
    throw new Error(
      "nenhum tipo de servico tem CNAE configurado. Sem isso a coleta traria o\n" +
        "comercio inteiro da regiao. Configure em Administracao > Catalogo.",
    );
  }
  console.log(`CNAEs do catalogo: ${prefixos.length > 0 ? prefixos.join(", ") : "(todos)"}\n`);

  const municipios = await mapaDeMunicipios(`${BASE}/${mes}/Municipios.zip`, cidades);
  console.log(`Municipios casados: ${municipios.size} de ${cidades.length}\n`);
  if (municipios.size === 0) throw new Error("nenhuma cidade-alvo encontrada na tabela TOM");

  const achados = await coletarEstabelecimentos(mes, partes, municipios, prefixos);
  await completarComEmpresas(mes, partes, achados);

  // Sem razao social a linha nao serve para nada, e significa que o CNPJ basico
  // nao apareceu em nenhuma parte de Empresas -- possivel quando se roda com
  // --partes reduzido.
  const registros = [...achados.values()].flat().filter((r) => r.razao_social);
  console.log(`\n${registros.length} empresas prontas.`);

  if (!supabase) {
    console.log("\n(--seco: nada gravado)\n");
    for (const r of registros.slice(0, 10)) {
      console.log(`  ${r.razao_social.padEnd(45).slice(0, 45)} ${r.cidade.padEnd(18)} ${r.cnae}`);
    }
    return;
  }

  await gravar(supabase, registros);
  console.log("\nPronto. A lista esta em Leads > Importar.");
}

main().catch((err) => {
  console.error(`\nErro: ${err.message}`);
  process.exit(1);
});
