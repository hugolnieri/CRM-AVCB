import type { TipoServico } from "@/types/servico";
import { servicosParaCnae } from "@/lib/cnae";

/**
 * Quão promissora é uma empresa da base de prospecção.
 *
 * O dump da Receita **não traz número de funcionários**, que seria o sinal
 * direto — treinamento de NR se vende por cabeça. O que existe são proxies:
 * porte declarado, capital social, ser matriz e idade. Nenhum deles sozinho
 * significa muito; juntos separam "construtora estabelecida com 40 obras" de
 * "MEI que abriu mês passado".
 *
 * O score vem sempre acompanhado dos **motivos**, e isso não é enfeite: um
 * número opaco de 0 a 10 não deixa ninguém discordar dele. Com os motivos à
 * vista, quem conhece a região corrige o sistema em vez de obedecer a ele.
 */

export type NivelQualificacao = "alta" | "media" | "baixa";

export interface Qualificacao {
  nivel: NivelQualificacao;
  pontos: number;
  /** Por que este nível, em pt-BR, para aparecer no tooltip da linha. */
  motivos: string[];
  /** Nomes dos serviços do catálogo que o CNAE desta empresa sugere. */
  servicos: string[];
}

export interface DadosQualificacao {
  cnae: string;
  porte: string | null;
  capitalSocial: number | null;
  matriz: boolean;
  inicioAtividade: string | null;
  telefone: string | null;
  email: string | null;
}

/**
 * Códigos de porte da Receita. "00" (não informado) e qualquer valor
 * desconhecido caem em null e simplesmente não pontuam — o certo para um campo
 * que a própria Receita deixa vazio com frequência.
 */
export const PORTE_LABELS: Record<string, string> = {
  "01": "Micro",
  "03": "Pequeno",
  "05": "Demais",
};

const LIMITE_ALTA = 5;
const LIMITE_MEDIA = 3;

export function qualificar(dados: DadosQualificacao, tipos: TipoServico[]): Qualificacao {
  const motivos: string[] = [];
  let pontos = 0;

  const servicos = servicosParaCnae(dados.cnae, tipos).map((t) => t.nome);

  // O sinal mais forte disponível, e o único que fala do NOSSO negócio e não do
  // tamanho da empresa: quantos serviços do catálogo se aplicam ao ramo dela.
  if (servicos.length >= 3) {
    pontos += 3;
    motivos.push(`${servicos.length} serviços do catálogo se aplicam ao ramo`);
  } else if (servicos.length > 0) {
    pontos += 2;
    motivos.push(
      servicos.length === 1
        ? "1 serviço do catálogo se aplica ao ramo"
        : `${servicos.length} serviços do catálogo se aplicam ao ramo`,
    );
  }

  // Porte declarado. "Demais" é tudo acima de EPP, então engloba desde média
  // até multinacional -- por isso vale mais, mas não muito mais.
  if (dados.porte === "05") {
    pontos += 3;
    motivos.push("Porte acima de pequena empresa");
  } else if (dados.porte === "03") {
    pontos += 2;
    motivos.push("Empresa de pequeno porte");
  } else if (dados.porte === "01") {
    motivos.push("Microempresa ou MEI — costuma não ter equipe para treinar");
  }

  if (dados.capitalSocial !== null && dados.capitalSocial >= 1_000_000) {
    pontos += 2;
    motivos.push("Capital social acima de R$ 1 milhão");
  } else if (dados.capitalSocial !== null && dados.capitalSocial >= 100_000) {
    pontos += 1;
    motivos.push("Capital social acima de R$ 100 mil");
  }

  // Matriz decide compra; filial normalmente executa o que a matriz contratou.
  if (dados.matriz) {
    pontos += 1;
    motivos.push("É a matriz");
  } else {
    motivos.push("É filial — a decisão costuma estar na matriz");
  }

  const anos = anosDeAtividade(dados.inicioAtividade);
  if (anos !== null && anos >= 3) {
    pontos += 1;
    motivos.push(`${anos} anos de atividade`);
  } else if (anos !== null && anos < 1) {
    motivos.push("Aberta há menos de um ano");
  }

  // Ter os dois meios de contato não diz nada sobre a empresa, mas diz muito
  // sobre a chance de conseguir falar com ela.
  if (dados.telefone && dados.email) {
    pontos += 1;
    motivos.push("Tem telefone e e-mail");
  }

  return {
    nivel: pontos >= LIMITE_ALTA ? "alta" : pontos >= LIMITE_MEDIA ? "media" : "baixa",
    pontos,
    motivos,
    servicos,
  };
}

/**
 * Anos completos desde a abertura. `agora` é injetável para o teste não
 * depender do relógio.
 */
export function anosDeAtividade(inicio: string | null, agora = new Date()): number | null {
  if (!inicio) return null;
  // Coluna `date`: fatiar a string evita o new Date("2020-01-01") lido como UTC
  // que volta um dia antes em UTC-3, o mesmo cuidado do resto do projeto.
  const [ano, mes, dia] = inicio.slice(0, 10).split("-").map(Number);
  if (!ano || !mes || !dia) return null;

  let anos = agora.getFullYear() - ano;
  const mesAtual = agora.getMonth() + 1;
  if (mesAtual < mes || (mesAtual === mes && agora.getDate() < dia)) anos -= 1;
  return anos < 0 ? null : anos;
}

export const NIVEL_LABELS: Record<NivelQualificacao, { label: string; color: string }> = {
  // Verde/cinza e não a rampa de urgência: laranja e amarelo estão reservados
  // para "a vencer" e "dado incompleto" em todo o resto do app.
  alta: { label: "Alta", color: "green" },
  media: { label: "Média", color: "blue" },
  baixa: { label: "Baixa", color: "gray" },
};
