import type { Lead, PipelineStage } from "@/types/lead";
import { PIPELINE_STAGES } from "@/lib/pipeline/stages";

export interface CountItem {
  key: string;
  label: string;
  count: number;
  /** Opcional: quando a categoria tem cor própria (etapa do funil, por exemplo). */
  color?: string;
}

export interface LeadReports {
  total: number;
  ganhos: number;
  perdidos: number;
  emAndamento: number;
  /** 0-100, fechados ganhos / (ganhos + perdidos). */
  taxaConversao: number;
  /** Soma de valorEstimado dos leads ainda em aberto. */
  valorEmAberto: number;
  porEtapa: CountItem[];
  porOrigem: CountItem[];
}

export function computeReports(leads: Lead[]): LeadReports {
  const total = leads.length;

  const stageCount = (stage: PipelineStage) =>
    leads.filter((l) => l.pipelineStage === stage).length;

  const ganhos = stageCount("fechado_ganho");
  const perdidos = stageCount("fechado_perdido");
  const emAndamento = total - ganhos - perdidos;

  const decididos = ganhos + perdidos;
  const taxaConversao = decididos > 0 ? Math.round((ganhos / decididos) * 100) : 0;

  const valorEmAberto = leads
    .filter((l) => l.pipelineStage !== "fechado_ganho" && l.pipelineStage !== "fechado_perdido")
    .reduce((sum, l) => sum + (l.valorEstimado ?? 0), 0);

  const porEtapa: CountItem[] = PIPELINE_STAGES.map((s) => ({
    key: s.value,
    label: s.label,
    count: stageCount(s.value),
    color: s.color,
  }));

  const origemMap = new Map<string, number>();
  for (const lead of leads) {
    const origem = lead.origem ?? "Não informada";
    origemMap.set(origem, (origemMap.get(origem) ?? 0) + 1);
  }
  const porOrigem: CountItem[] = Array.from(origemMap.entries())
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { total, ganhos, perdidos, emAndamento, taxaConversao, valorEmAberto, porEtapa, porOrigem };
}
