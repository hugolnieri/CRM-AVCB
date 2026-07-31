import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import styles from "./page.module.css";

/**
 * Apresentação da NR-35 para o cliente que já demonstrou interesse.
 *
 * Não é página de captação: quem abre este link já falou com o vendedor. O
 * trabalho dela é responder o que vem depois do "quero" -- o que a equipe
 * recebe, quanto tempo leva, o que a empresa precisa providenciar -- para a
 * conversa seguinte ser sobre data e não sobre o que está incluso.
 *
 * Server component de propósito: `metadata` só existe fora do cliente, e o
 * link vai ser colado no WhatsApp, onde o preview é a primeira impressão.
 *
 * Estática por decisão de segurança, não por preguiça: liberar a rota no
 * `proxy.ts` sem tocar o PostgREST mantém a RLS inteira valendo só para
 * `authenticated` (ver docs/briefing-landing-pages-vendedor.md).
 */
export const metadata: Metadata = {
  title: "NR-35 — Trabalho em Altura | SEICO",
  description:
    "Treinamento normativo de Trabalho em Altura: 8 horas, certificado com validade de 2 anos e conteúdo conforme a NR-35.",
  openGraph: {
    title: "NR-35 — Trabalho em Altura | SEICO",
    description:
      "Treinamento normativo de Trabalho em Altura: 8 horas, certificado com validade de 2 anos e conteúdo conforme a NR-35.",
    type: "website",
  },
};

/**
 * Auto-hospedadas pelo next/font: nenhuma requisição a CDN em tempo de
 * execução, então não há risco de a página chegar ao cliente com a fonte
 * substituída em silêncio.
 */
const tipoTitulo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--fonte-titulo",
  display: "swap",
});

const tipoTexto = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--fonte-texto",
  display: "swap",
});

const tipoDado = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--fonte-dado",
  display: "swap",
});

/** A folha de especificação: o que o cliente confere antes de qualquer coisa. */
const FICHA = [
  { rotulo: "Carga horária", valor: "8 h", nota: "mínimo exigido pela norma" },
  { rotulo: "Validade", valor: "24 meses", nota: "reciclagem bienal" },
  { rotulo: "Formato", valor: "Teórico + prático", nota: "com os equipamentos da atividade" },
  { rotulo: "Entrega", valor: "Certificado individual", nota: "com conteúdo e carga horária" },
];

/** Conteúdo programático mínimo exigido pelo item 35.3.2 da própria norma. */
const CONTEUDO = [
  "Normas e regulamentos aplicáveis ao trabalho em altura",
  "Análise de risco e condições impeditivas",
  "Riscos potenciais inerentes ao trabalho em altura, e medidas de prevenção e controle",
  "Sistemas, equipamentos e procedimentos de proteção coletiva",
  "EPI para trabalho em altura: seleção, inspeção, conservação e limitação de uso",
  "Acidentes típicos de trabalho em altura",
  "Condutas em emergência, incluindo noções de técnicas de resgate e primeiros socorros",
];

/** Sequência real, na ordem em que acontece -- por isso vai numerada. */
const ETAPAS = [
  {
    titulo: "Você escolhe a data",
    texto: "Indique o dia e o turno que tiram a equipe da operação com menos impacto.",
  },
  {
    titulo: "Confirmamos a lista",
    texto: "Nome completo e CPF de cada participante. É o que sai impresso no certificado.",
  },
  {
    titulo: "Realizamos o treinamento",
    texto:
      "Parte teórica e parte prática, com os mesmos equipamentos que a equipe usa no dia a dia.",
  },
  {
    titulo: "Emitimos os certificados",
    texto: "Um por participante, pronto para apresentar em fiscalização e auditoria.",
  },
];

export default function LandingNr35() {
  const fontes = `${tipoTitulo.variable} ${tipoTexto.variable} ${tipoDado.variable}`;

  return (
    <div className={`${fontes} ${styles.pagina}`}>
      <main className={styles.coluna}>
        <header className={styles.hero}>
          <p className={styles.marca}>
            SEICO <span className={styles.marcaSep}>/</span> Segurança do Trabalho
          </p>

          <p className={styles.norma}>NR-35 · Treinamento normativo</p>
          <h1 className={styles.titulo}>Trabalho em Altura</h1>
          <p className={styles.subtitulo}>
            Sua equipe treinada e certificada dentro da norma — com o documento que a fiscalização
            pede, na validade.
          </p>

          {/*
            O limiar de 2 metros desenhado como linha de verdade: é a coisa mais
            característica do assunto -- acima dela a norma passa a valer -- e
            dizer isso com uma régua economiza um parágrafo de explicação.
          */}
          <div className={styles.limiar} aria-hidden="true">
            <span className={styles.limiarCota}>2,00 m</span>
            <span className={styles.limiarLinha} />
          </div>
          <p className={styles.limiarNota}>
            A partir desta altura, com risco de queda, o treinamento é obrigatório.
          </p>
        </header>

        <section className={styles.secao}>
          <h2 className={styles.secaoTitulo}>A ficha do treinamento</h2>
          <dl className={styles.ficha}>
            {FICHA.map((item) => (
              <div className={styles.fichaLinha} key={item.rotulo}>
                <dt className={styles.fichaRotulo}>{item.rotulo}</dt>
                <dd className={styles.fichaValor}>
                  {item.valor}
                  <span className={styles.fichaNota}>{item.nota}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.secao}>
          <h2 className={styles.secaoTitulo}>Quem precisa ser treinado</h2>
          <p className={styles.texto}>
            Todo trabalhador que executa atividade acima de 2 metros com risco de queda, e também
            quem supervisiona essa atividade. Na prática: construção civil, manutenção predial e
            industrial, limpeza de fachada, montagem de estruturas, torres e antenas.
          </p>
          <aside className={styles.aviso}>
            <p className={styles.avisoTitulo}>O certificado vence</p>
            <p className={styles.avisoTexto}>
              A reciclagem é bienal, e também é exigida quando muda o procedimento de trabalho,
              quando alguém troca de função ou volta de afastamento maior que 90 dias. Certificado
              fora da validade é a não conformidade mais comum em fiscalização.
            </p>
          </aside>
        </section>

        <section className={styles.secao}>
          <h2 className={styles.secaoTitulo}>O que sua equipe recebe</h2>
          <ul className={styles.conteudo}>
            {CONTEUDO.map((item) => (
              <li className={styles.conteudoItem} key={item}>
                {item}
              </li>
            ))}
          </ul>
          <p className={styles.fonte}>
            <span className={styles.clausula}>35.3.2</span>
            Conteúdo programático mínimo definido pela própria norma.
          </p>
        </section>

        <section className={styles.secao}>
          <h2 className={styles.secaoTitulo}>Como funciona</h2>
          <ol className={styles.etapas}>
            {ETAPAS.map((etapa, i) => (
              <li className={styles.etapa} key={etapa.titulo}>
                <span className={styles.etapaNumero}>{String(i + 1).padStart(2, "0")}</span>
                <div className={styles.etapaCorpo}>
                  <h3 className={styles.etapaTitulo}>{etapa.titulo}</h3>
                  <p className={styles.etapaTexto}>{etapa.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.secao}>
          <h2 className={styles.secaoTitulo}>Por que a SEICO</h2>
          <p className={styles.pendente}>
            <span className={styles.pendenteSelo}>A preencher</span>
            Diferenciais reais da empresa: tempo de mercado, formação dos instrutores, região
            atendida, estrutura para a parte prática. Deixado em branco de propósito — é informação
            da empresa, e texto inventado aqui vira promessa feita a um cliente.
          </p>
        </section>

        <section className={styles.chamada}>
          <h2 className={styles.chamadaTitulo}>Vamos marcar a data?</h2>
          <p className={styles.chamadaTexto}>
            Responda a mensagem com o melhor dia para a sua equipe que nós confirmamos a agenda.
          </p>
          <p className={styles.pendente}>
            <span className={styles.pendenteSelo}>A preencher</span>
            Telefone/WhatsApp e e-mail de contato da SEICO.
          </p>
        </section>

        <footer className={styles.rodape}>
          <p className={styles.rodapeMarca}>SEICO — Segurança do Trabalho</p>
          <p className={styles.rodapeNota}>Treinamentos normativos e serviços de segurança.</p>
        </footer>
      </main>
    </div>
  );
}
