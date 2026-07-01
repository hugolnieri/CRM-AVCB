export type PipelineStage =
  | "novo_lead"
  | "contato_feito"
  | "visita_diagnostico_agendado"
  | "proposta_enviada"
  | "fechado_ganho"
  | "fechado_perdido";

export type AvcbStatus = "em_dia" | "a_vencer" | "vencido" | "nao_informado";

/** Tipo de licença do Corpo de Bombeiros que o imóvel possui/precisa. */
export type LicencaTipo = "AVCB" | "CLCB" | "TAACB";

/** Endereço estruturado e editável do lead. */
export interface EnderecoDetalhado {
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
}

export interface ParsedLead {
  mapsUrl: string;
  placeId: string | null;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  address: string | null;
  status: string | null;
  hours: string | null;
  phoneRaw: string | null;
  phoneE164: string | null;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  lastReviewSnippet: string | null;
}

/**
 * The persisted lead. Note this deliberately drops `status`/`hours` from
 * ParsedLead — open/closed business-hours text is only useful at import-preview
 * time and isn't stored (see supabase/migrations/0001_init_schema.sql).
 */
export interface Lead extends Omit<ParsedLead, "status" | "hours"> {
  id: string;
  pipelineStage: PipelineStage;
  tipoLicenca: LicencaTipo;
  avcbStatus: AvcbStatus;
  avcbValidade: string | null;
  assignedUserId: string | null;
  cnpj: string | null;
  receitaData: import("./receita").ReceitaData | null;
  enderecoDetalhado: EnderecoDetalhado | null;
  bombeirosConsulta: import("./bombeiros").BombeirosConsulta | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}
