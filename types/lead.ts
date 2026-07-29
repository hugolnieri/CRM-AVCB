export type PipelineStage =
  | "novo_lead"
  | "contato_feito"
  | "visita_diagnostico_agendado"
  | "proposta_enviada"
  | "fechado_ganho"
  | "fechado_perdido";

/**
 * Oportunidade comercial ainda não fechada. Quando chega em `fechado_ganho` é
 * convertida em Cliente (ver lib/conversao.ts); o lead permanece como registro
 * histórico do funil e o vínculo mora em `clientes.lead_id`.
 */
export interface Lead {
  id: string;
  /** Nome da empresa (ou do contato, quando ainda não se sabe a razão social). */
  name: string;
  cnpj: string | null;
  /**
   * Atividade econômica, só dígitos: 2 (divisão/segmento), 5 (classe) ou 7
   * (subclasse). Alimenta a sugestão automática de serviços — ver lib/cnae.ts.
   */
  cnae: string | null;
  /** Nome da atividade no momento do cadastro. Ver a migration 0013. */
  cnaeDescricao: string | null;
  contatoNome: string | null;
  phoneRaw: string | null;
  phoneE164: string | null;
  email: string | null;
  address: string | null;
  cidade: string | null;
  uf: string | null;
  /** Como chegou: indicação, site, telefone, evento... Ver LEAD_ORIGENS. */
  origem: string | null;
  /** Que treinamento ou serviço a empresa procura, em texto livre. */
  interesse: string | null;
  /**
   * Serviços do catálogo que fazem sentido oferecer a este lead. Guarda os
   * nomes, não FKs: é intenção comercial, não vínculo referencial — e o nome
   * continua legível se o tipo for renomeado ou desativado depois.
   */
  possiveisServicos: string[] | null;
  valorEstimado: number | null;
  pipelineStage: PipelineStage;
  /** Data/hora do próximo retorno agendado (ISO). Null = sem follow-up pendente. */
  followUpAt: string | null;
  followUpNote: string | null;
  position: number;
  assignedUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Campos que a UI escreve. Separado de `Lead` porque id/position/timestamps são
 * do banco, não do formulário. Usado tanto no create quanto no update parcial.
 */
export type LeadInput = Pick<
  Lead,
  | "name"
  | "cnpj"
  | "cnae"
  | "cnaeDescricao"
  | "contatoNome"
  | "phoneRaw"
  | "phoneE164"
  | "email"
  | "address"
  | "cidade"
  | "uf"
  | "origem"
  | "interesse"
  | "possiveisServicos"
  | "valorEstimado"
  | "pipelineStage"
  | "followUpAt"
  | "followUpNote"
  | "assignedUserId"
>;
