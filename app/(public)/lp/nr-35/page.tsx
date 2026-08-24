import type { Metadata } from "next";
import Image from "next/image";
import heroImage from "@/public/images/lp/nr-35-codex-hero.png";
import styles from "./page.module.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "NR-35 — Treinamento para Trabalho em Altura | SEICO",
  description:
    "Veja o escopo do treinamento NR-35: 8 horas, conteúdo previsto na norma e certificado com validade de 2 anos.",
  openGraph: {
    title: "NR-35 — Trabalho em Altura | SEICO",
    description:
      "8 horas de treinamento, conteúdo previsto na NR-35 e certificado com validade de 2 anos. Confira os próximos passos.",
    type: "website",
  },
};

const MODULOS = [
  {
    numero: "01",
    titulo: "Reconhecer o risco",
    texto:
      "Normas aplicáveis, análise de risco, condições impeditivas e riscos potenciais do trabalho em altura.",
    itens: ["Normas e regulamentos", "Análise de risco", "Prevenção e controle"],
  },
  {
    numero: "02",
    titulo: "Trabalhar protegido",
    texto:
      "Sistemas e procedimentos de proteção coletiva, além do uso responsável dos equipamentos individuais.",
    itens: ["Proteção coletiva", "Seleção e inspeção de EPI", "Conservação e limites de uso"],
  },
  {
    numero: "03",
    titulo: "Responder ao imprevisto",
    texto:
      "Acidentes típicos e condutas em emergência, incluindo noções de resgate e primeiros socorros.",
    itens: ["Acidentes típicos", "Condutas de emergência", "Resgate e primeiros socorros"],
  },
];

const ETAPAS = [
  {
    numero: "1",
    titulo: "Alinhamos o cenário",
    texto: "Quantidade de participantes, atividades executadas e contexto da operação.",
  },
  {
    numero: "2",
    titulo: "Fechamos o formato",
    texto: "Local, estrutura necessária, investimento e condições ficam registrados antes da data.",
  },
  {
    numero: "3",
    titulo: "Reservamos a agenda",
    texto: "Sua empresa indica as melhores opções de dia e turno para confirmação.",
  },
  {
    numero: "4",
    titulo: "Realizamos e certificamos",
    texto: "Após o treinamento, cada participante recebe seu certificado individual.",
  },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function LandingNr35() {
  return (
    <main className={styles.pagina}>
      <section className={styles.hero} aria-labelledby="titulo-nr35">
        <div className={styles.heroMedia} aria-hidden="true">
          <Image
            src={heroImage}
            alt=""
            fill
            preload
            placeholder="blur"
            sizes="100vw"
            className={styles.heroImage}
          />
          <div className={styles.heroScrim} />
        </div>

        <div className={styles.heroInner}>
          <header className={styles.topo}>
            <a className={styles.marca} href="#titulo-nr35" aria-label="SEICO — início da página">
              <span className={styles.marcaSimbolo} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>
                <strong>SEICO</strong>
                <small>Segurança do Trabalho</small>
              </span>
            </a>
            <span className={styles.edicao}>Apresentação comercial · NR-35</span>
          </header>

          <div className={styles.heroConteudo}>
            <p className={styles.sobretitulo}>
              <span /> Treinamento normativo
            </p>
            <h1 id="titulo-nr35">
              Trabalho em altura,
              <span>com o escopo às claras.</span>
            </h1>
            <p className={styles.heroTexto}>
              Tudo o que sua empresa precisa confirmar antes de escolher a data: carga horária,
              conteúdo, validade e próximos passos.
            </p>

            <a className={styles.botaoHero} href="#proximos-passos">
              Ver como agendar <ArrowIcon />
            </a>

            <dl className={styles.numeros}>
              <div>
                <dt>8h</dt>
                <dd>carga horária mínima</dd>
              </div>
              <div>
                <dt>24</dt>
                <dd>meses de validade</dd>
              </div>
              <div>
                <dt>2m+</dt>
                <dd>com risco de queda</dd>
              </div>
            </dl>
          </div>

          <p className={styles.legendaImagem}>Ilustração conceitual</p>
        </div>
      </section>

      <section className={styles.resumo} aria-label="Resumo do treinamento">
        <div className={styles.resumoInner}>
          <p>Para quem já decidiu treinar a equipe</p>
          <ul>
            <li>
              <CheckIcon /> Conteúdo conforme a NR-35
            </li>
            <li>
              <CheckIcon /> Certificado individual
            </li>
            <li>
              <CheckIcon /> Reciclagem bienal
            </li>
          </ul>
        </div>
      </section>

      <div className={styles.conteudo}>
        <section className={styles.secao} aria-labelledby="conteudo-titulo">
          <div className={styles.cabecalhoSecao}>
            <p className={styles.rotulo}>O que está incluído</p>
            <h2 id="conteudo-titulo">O conteúdo essencial, organizado para a prática.</h2>
            <p>
              As 8 horas cobrem o conteúdo programático mínimo previsto no item 35.3.2 da NR-35,
              aqui agrupado em três frentes para facilitar a leitura.
            </p>
          </div>

          <div className={styles.modulos}>
            {MODULOS.map((modulo) => (
              <article className={styles.modulo} key={modulo.numero}>
                <div className={styles.moduloTopo}>
                  <span>{modulo.numero}</span>
                  <i aria-hidden="true" />
                </div>
                <h3>{modulo.titulo}</h3>
                <p>{modulo.texto}</p>
                <ul>
                  {modulo.itens.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.validade} aria-labelledby="validade-titulo">
          <div className={styles.validadeNumero} aria-hidden="true">
            <strong>02</strong>
            <span>anos</span>
          </div>
          <div>
            <p className={styles.rotuloClaro}>Quando renovar</p>
            <h2 id="validade-titulo">A reciclagem é bienal — e há situações que antecipam.</h2>
            <p>
              Também deve ocorrer quando houver mudança nos procedimentos, troca de função ou
              retorno de afastamento superior a 90 dias.
            </p>
          </div>
        </section>

        <section className={`${styles.secao} ${styles.preparacao}`} aria-labelledby="preparar-titulo">
          <div className={styles.cabecalhoSecao}>
            <p className={styles.rotulo}>Antes de reservar o dia</p>
            <h2 id="preparar-titulo">Três respostas deixam o agendamento mais rápido.</h2>
          </div>

          <div className={styles.preparacaoGrid}>
            <ol className={styles.perguntas}>
              <li>
                <span>01</span>
                <div>
                  <h3>Quem participa?</h3>
                  <p>Quantidade de pessoas e funções exercidas pela equipe.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>Qual é a atividade?</h3>
                  <p>Onde o trabalho em altura acontece e quais tarefas são executadas.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Quando funciona melhor?</h3>
                  <p>Opções de data e turno que impactem menos a operação.</p>
                </div>
              </li>
            </ol>

            <aside className={styles.confirmacao}>
              <span className={styles.confirmacaoSelo}>A SEICO confirma</span>
              <h3>Sem surpresa depois do aceite.</h3>
              <p>
                Formato, estrutura necessária, condições comerciais e disponibilidade precisam
                ficar claros antes de a data entrar na agenda.
              </p>
              <div className={styles.placeholder}>
                <strong>[A PREENCHER ANTES DE PUBLICAR]</strong>
                <span>
                  Modalidade, prazo de agendamento, investimento e estrutura oferecida para a
                  parte prática.
                </span>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.secao} aria-labelledby="diferenciais-titulo">
          <div className={styles.diferenciais}>
            <div>
              <p className={styles.rotulo}>Por que a SEICO</p>
              <h2 id="diferenciais-titulo">Confiança se constrói com fatos.</h2>
              <p>
                Este espaço deve apresentar apenas diferenciais verificáveis da empresa — nunca
                uma promessa genérica inventada para preencher a página.
              </p>
            </div>
            <div className={`${styles.placeholder} ${styles.placeholderGrande}`}>
              <strong>[A PREENCHER ANTES DE PUBLICAR]</strong>
              <span>
                Tempo de mercado, formação dos instrutores, região atendida e diferenciais reais
                da estrutura da SEICO.
              </span>
            </div>
          </div>
        </section>

        <section className={`${styles.secao} ${styles.jornada}`} aria-labelledby="jornada-titulo">
          <div className={styles.cabecalhoSecao}>
            <p className={styles.rotulo}>Do aceite ao certificado</p>
            <h2 id="jornada-titulo">Um caminho simples, sem etapa escondida.</h2>
          </div>
          <ol className={styles.etapas}>
            {ETAPAS.map((etapa) => (
              <li key={etapa.numero}>
                <span className={styles.etapaNumero}>{etapa.numero}</span>
                <div>
                  <h3>{etapa.titulo}</h3>
                  <p>{etapa.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className={styles.cta} id="proximos-passos" aria-labelledby="cta-titulo">
        <div className={styles.ctaDecoracao} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className={styles.ctaInner}>
          <p className={styles.rotuloClaro}>Próximo passo</p>
          <h2 id="cta-titulo">Agora, a conversa é sobre data.</h2>
          <p>
            Responda ao vendedor com a quantidade de participantes e duas opções de dia. A SEICO
            retorna com a disponibilidade e o alinhamento final.
          </p>
          <div className={styles.placeholderContato}>
            <strong>[CONTATO A PREENCHER]</strong>
            <span>WhatsApp, telefone e e-mail oficiais da SEICO.</span>
          </div>
        </div>
      </section>

      <footer className={styles.rodape}>
        <div>
          <strong>SEICO</strong>
          <span>Segurança do Trabalho</span>
        </div>
        <p>NR-35 · Trabalho em Altura</p>
      </footer>
    </main>
  );
}
