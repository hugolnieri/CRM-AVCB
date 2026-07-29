import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Geocodificação das cidades do mapa do pipeline.
 *
 * É a segunda rota de servidor do projeto, pelo mesmo tipo de motivo da
 * primeira (`/api/notificar`): a política de uso do Nominatim exige um
 * `User-Agent` identificável e no máximo uma consulta por segundo, e nenhuma das
 * duas coisas dá para garantir a partir do navegador — o browser proíbe definir
 * `User-Agent`, e cada aba abriria seu próprio ritmo de requisições.
 *
 * Cada cidade é consultada UMA vez na vida. O resultado (inclusive o negativo)
 * vai para a tabela `cidades`, e o `tentada_em` é o que impede uma cidade que
 * não existe de ser reconsultada a cada abertura da tela.
 */

/** Teto por chamada. Com 1 req/s, 10 cidades já são 10 segundos de rota. */
const MAX_POR_CHAMADA = 10;
const INTERVALO_MS = 1100;

interface Entrada {
  chave: string;
  nome: string;
  uf: string;
}

interface NominatimResultado {
  lat: string;
  lon: string;
}

async function consultar(nome: string, uf: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("country", "Brasil");
  url.searchParams.set("city", nome);
  if (uf) url.searchParams.set("state", uf);

  const resposta = await fetch(url, {
    headers: {
      // Exigido pela política de uso do Nominatim: requisição sem identificação
      // é bloqueada.
      "User-Agent": "SEICO-CRM/1.0 (contato via app)",
      "Accept-Language": "pt-BR",
    },
  });

  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as NominatimResultado[];
  const primeiro = dados[0];
  if (!primeiro) return null;

  const lat = Number(primeiro.lat);
  const lng = Number(primeiro.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export async function POST(request: Request) {
  let payload: { cidades?: Entrada[] };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const cidades = (payload.cidades ?? []).filter(
    (c) => typeof c?.chave === "string" && typeof c?.nome === "string",
  );
  if (cidades.length === 0) {
    return NextResponse.json({ geocodificadas: 0 });
  }

  // Rota pública por padrão; só quem tem sessão dispara consulta externa.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let geocodificadas = 0;

  for (const [indice, cidade] of cidades.slice(0, MAX_POR_CHAMADA).entries()) {
    // Intervalo entre consultas, não antes da primeira.
    if (indice > 0) await new Promise((r) => setTimeout(r, INTERVALO_MS));

    let ponto: { lat: number; lng: number } | null = null;
    try {
      ponto = await consultar(cidade.nome, cidade.uf);
    } catch {
      // Falha de rede: grava a tentativa mesmo assim, com coordenada nula. Sem
      // isso a cidade voltaria à fila em toda abertura do mapa.
    }

    // Grava com a sessão do usuário (RLS), como todo o resto do app.
    const { error } = await supabase.from("cidades").upsert(
      {
        chave: cidade.chave,
        nome: cidade.nome,
        uf: cidade.uf,
        lat: ponto?.lat ?? null,
        lng: ponto?.lng ?? null,
        tentada_em: new Date().toISOString(),
      },
      { onConflict: "chave" },
    );

    if (!error && ponto) geocodificadas += 1;
  }

  return NextResponse.json({ geocodificadas, restantes: Math.max(0, cidades.length - MAX_POR_CHAMADA) });
}
