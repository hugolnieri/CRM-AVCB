/**
 * O que a meta mede. `contatos_lead` conta leads DISTINTOS contatados no
 * período, não número de atividades — "falar com 40 leads por dia" significa 40
 * empresas, não 40 registros no mesmo lead. Quem quer contar interações usa
 * `atividades`.
 */
export type MetaMetrica =
  | "contatos_lead"
  | "atividades"
  | "fechamentos"
  | "leads_novos"
  | "servicos_realizados"
  | "valor_fechado";

export type MetaPeriodo = "diaria" | "semanal" | "mensal";

export interface Meta {
  id: string;
  /** Null = meta da equipe: vale para todo colaborador, cada um com seu progresso. */
  memberId: string | null;
  nome: string;
  metrica: MetaMetrica;
  periodo: MetaPeriodo;
  alvo: number;
  ativa: boolean;
  /** "YYYY-MM-DD". Vigência opcional, para metas de campanha. */
  inicioEm: string | null;
  fimEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MetaInput = Omit<Meta, "id" | "createdAt" | "updatedAt">;

export const METRICA_LABELS: Record<MetaMetrica, { label: string; unidade: string; ajuda: string }> = {
  contatos_lead: {
    label: "Leads contatados",
    unidade: "leads",
    ajuda: "Leads distintos com alguma interação registrada no período",
  },
  atividades: {
    label: "Atividades registradas",
    unidade: "atividades",
    ajuda: "Total de interações, mesmo várias no mesmo lead",
  },
  fechamentos: {
    label: "Fechamentos",
    unidade: "clientes",
    ajuda: "Leads convertidos em cliente",
  },
  leads_novos: {
    label: "Leads cadastrados",
    unidade: "leads",
    ajuda: "Leads novos criados no período",
  },
  servicos_realizados: {
    label: "Serviços realizados",
    unidade: "serviços",
    ajuda: "Serviços concluídos em que a pessoa é a responsável",
  },
  valor_fechado: {
    label: "Valor fechado",
    unidade: "R$",
    ajuda: "Soma do valor estimado dos leads ganhos no período",
  },
};

export const PERIODO_LABELS: Record<MetaPeriodo, { label: string; adjetivo: string }> = {
  diaria: { label: "Por dia", adjetivo: "hoje" },
  semanal: { label: "Por semana", adjetivo: "esta semana" },
  mensal: { label: "Por mês", adjetivo: "este mês" },
};
