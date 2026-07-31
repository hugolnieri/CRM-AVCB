import type { Metadata } from "next";
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

/** Conteúdo programático mínimo exigido pelo item 35.3.2 da própria norma. */
const CONTEUDO = [
  "Normas e regulamentos aplicáveis ao trabalho em altura",
  "Análise de risco e condições impeditivas",
  "Riscos potenciais inerentes ao trabalho em altura e medidas de prevenção e controle",
  "Sistemas, equipamentos e procedimentos de proteção coletiva",
  "EPI para trabalho em altura: seleção, inspeção, conservação e limitação de uso",
  "Acidentes típicos de trabalho em altura",
  "Condutas em situações de emergência, incluindo noções de técnicas de resgate e primeiros socorros",
];

const ETAPAS = [
  {
    titulo: "Definimos a data",
    texto: "Você indica o melhor dia e turno para tirar a equipe da operação.",
  },
  {
    titulo: "Confirmamos a lista",
    texto: "Nome completo e CPF de cada participante — é o que vai no certificado.",
  },
  {
    titulo: "Realizamos o treinamento",
    texto: "Parte teórica e prática, com os equipamentos usados no dia a dia da atividade.",
  },
  {
    titulo: "Emitimos os certificados",
    texto: "Certificado individual, com o conteúdo e a carga horária, pronto para fiscalização.",
  },
];

export default function LandingNr35() {
  return (
    <main className={styles.pagina}>
      <header className={styles.hero}>
        <p className={styles.marca}>SEICO — Segurança do Trabalho</p>
        <h1 className={styles.titulo}>NR-35 — Trabalho em Altura</h1>
        <p className={styles.subtitulo}>
          Treinamento normativo obrigatório para todo trabalho executado acima de 2 metros do
          nível inferior, onde haja risco de queda.
        </p>

        <ul className={styles.selos}>
          <li>
            <strong>8h</strong>
            <span>carga horária</span>
          </li>
          <li>
            <strong>2 anos</strong>
            <span>validade do certificado</span>
          </li>
          <li>
            <strong>Teórico + prático</strong>
            <span>conforme a norma</span>
          </li>
        </ul>
      </header>

      <section className={styles.secao}>
        <h2>Quem precisa ser treinado</h2>
        <p>
          Todo trabalhador que executa atividade acima de 2 metros com risco de queda — e também
          quem supervisiona essa atividade. Na prática, é o caso de construção civil, manutenção
          predial e industrial, limpeza de fachada, montagem de estruturas e serviços em torres e
          antenas.
        </p>
        <p className={styles.reforco}>
          A norma exige <strong>reciclagem a cada 2 anos</strong>, e também sempre que houver
          mudança nos procedimentos, troca de função ou retorno de afastamento superior a 90 dias.
          Certificado vencido é a não conformidade mais comum em fiscalização.
        </p>
      </section>

      <section className={styles.secao}>
        <h2>O que sua equipe recebe</h2>
        <ul className={styles.lista}>
          {CONTEUDO.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className={styles.nota}>
          Conteúdo programático mínimo definido pelo item 35.3.2 da NR-35.
        </p>
      </section>

      <section className={styles.secao}>
        <h2>Como funciona</h2>
        <ol className={styles.etapas}>
          {ETAPAS.map((etapa, i) => (
            <li key={etapa.titulo}>
              <span className={styles.numero}>{i + 1}</span>
              <div>
                <strong>{etapa.titulo}</strong>
                <p>{etapa.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.secao}>
        <h2>Por que a SEICO</h2>
        <p className={styles.placeholder}>
          [A PREENCHER] Diferenciais reais da empresa — tempo de mercado, formação dos instrutores,
          região atendida, estrutura para a parte prática. Não preenchido pelo Claude de propósito:
          é informação da empresa, e inventar aqui vira promessa ao cliente.
        </p>
      </section>

      <section className={styles.cta}>
        <h2>Vamos marcar a data?</h2>
        <p>Responda a mensagem com o melhor dia para a sua equipe e nós confirmamos a agenda.</p>
        <p className={styles.placeholder}>
          [A PREENCHER] Telefone/WhatsApp e e-mail de contato da SEICO.
        </p>
      </section>

      <footer className={styles.rodape}>
        <p>SEICO — Segurança do Trabalho</p>
      </footer>
    </main>
  );
}
