import { createClient } from "@/lib/supabase/client";
import type { Cidade } from "@/types/cidade";

interface CidadeRow {
  chave: string;
  nome: string;
  uf: string;
  lat: number | null;
  lng: number | null;
  tentada_em: string | null;
  created_at: string;
}

function mapRowToCidade(row: CidadeRow): Cidade {
  return {
    chave: row.chave,
    nome: row.nome,
    uf: row.uf,
    lat: row.lat,
    lng: row.lng,
    tentadaEm: row.tentada_em,
    createdAt: row.created_at,
  };
}

export async function fetchCidades(): Promise<Cidade[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("cidades").select("*");

  if (error) throw error;
  return (data as CidadeRow[]).map(mapRowToCidade);
}

/**
 * Pede a geocodificação das cidades que ainda não têm coordenada.
 *
 * Best-effort de propósito, no mesmo espírito de `registrarNotificacao`: o mapa
 * já desenha o que tem em cache, e uma cidade a mais aparecer só na próxima
 * abertura é melhor do que a tela falhar porque o Nominatim está fora do ar.
 */
export async function geocodificarPendentes(
  cidades: { chave: string; nome: string; uf: string }[],
): Promise<number> {
  if (cidades.length === 0) return 0;

  try {
    const resposta = await fetch("/api/geocodificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cidades }),
    });
    if (!resposta.ok) return 0;
    const { geocodificadas } = (await resposta.json()) as { geocodificadas?: number };
    return geocodificadas ?? 0;
  } catch {
    return 0;
  }
}
