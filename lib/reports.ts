import type { AvcbStatus, Lead, PipelineStage } from "@/types/lead";
import { PIPELINE_STAGES } from "@/lib/pipeline/stages";
import { AVCB_STATUSES } from "@/lib/pipeline/avcbStatus";

export interface CountItem {
  key: string;
  label: string;
  count: number;
}

export interface LeadReports {
  total: number;
  clientes: number;
  perdidos: number;
  emAndamento: number;
  avcbVencidos: number;
  taxaConversao: number; // 0-100, fechados ganhos / (ganhos + perdidos)
  porEtapa: CountItem[];
  porAvcb: CountItem[];
  porCategoria: CountItem[];
}

export function computeReports(leads: Lead[]): LeadReports {
  const total = leads.length;

  const stageCount = (stage: PipelineStage) =>
    leads.filter((l) => l.pipelineStage === stage).length;

  const clientes = stageCount("fechado_ganho");
  const perdidos = stageCount("fechado_perdido");
  const emAndamento = total - clientes - perdidos;
  const avcbVencidos = leads.filter((l) => l.avcbStatus === "vencido").length;

  const decididos = clientes + perdidos;
  const taxaConversao = decididos > 0 ? Math.round((clientes / decididos) * 100) : 0;

  const porEtapa: CountItem[] = PIPELINE_STAGES.map((s) => ({
    key: s.value,
    label: s.label,
    count: stageCount(s.value),
  }));

  const porAvcb: CountItem[] = AVCB_STATUSES.map((s) => ({
    key: s.value,
    label: s.label,
    count: leads.filter((l) => l.avcbStatus === (s.value as AvcbStatus)).length,
  }));

  const categoryMap = new Map<string, number>();
  for (const lead of leads) {
    const cat = lead.category ?? "Sem categoria";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }
  const porCategoria: CountItem[] = Array.from(categoryMap.entries())
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total,
    clientes,
    perdidos,
    emAndamento,
    avcbVencidos,
    taxaConversao,
    porEtapa,
    porAvcb,
    porCategoria,
  };
}
