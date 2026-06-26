export type PipelineStage =
  | "novo_lead"
  | "contato_feito"
  | "visita_diagnostico_agendado"
  | "proposta_enviada"
  | "fechado_ganho"
  | "fechado_perdido";

export type AvcbStatus = "em_dia" | "a_vencer" | "vencido" | "nao_informado";

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

export interface Lead extends ParsedLead {
  id: string;
  pipelineStage: PipelineStage;
  avcbStatus: AvcbStatus;
  avcbValidade: string | null;
  assignedUserId: string | null;
  createdAt: string;
  updatedAt: string;
}
