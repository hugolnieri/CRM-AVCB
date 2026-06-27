import { NextResponse } from "next/server";

/**
 * Server-side proxy to the Infosimples "PM/SP/Licença Bombeiros" API
 * (https://api.infosimples.com/api/v2/consultas/pm/sp/licenca-bombeiros).
 * Each call is billed (~R$0.20) to the configured account, so this MUST stay
 * server-side: the token can never reach the browser bundle, and every call is
 * a deliberate, explicit user action (a button click), never automatic.
 */

const ENDPOINT = "https://api.infosimples.com/api/v2/consultas/pm/sp/licenca-bombeiros";

interface InfosimplesData {
  bairro?: string;
  complemento?: string;
  endereco?: string;
  municipio?: string;
  numero_licensa?: string;
  ocupacao?: string;
  situacao?: string;
  tipo_licenca?: string;
  site_receipt?: string;
}

interface InfosimplesResponse {
  code: number;
  code_message: string;
  errors: string[];
  data_count: number;
  data: InfosimplesData[];
}

function normalizeMunicipio(municipio: string): string {
  return municipio
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

export async function POST(request: Request) {
  const token = process.env.INFOSIMPLES_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "INFOSIMPLES_API_TOKEN não configurado no servidor." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const municipio = body?.municipio?.trim();
  const endereco = body?.endereco?.trim();
  const numero = body?.numero?.trim();

  if (!municipio || !endereco) {
    return NextResponse.json(
      { ok: false, error: "Município e endereço são obrigatórios." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    token,
    municipio: normalizeMunicipio(municipio),
    endereco,
    timeout: "300",
  });
  if (numero) params.set("numero", numero);

  try {
    const res = await fetch(ENDPOINT, { method: "POST", body: params });
    const json = (await res.json()) as InfosimplesResponse;

    if (json.code !== 200) {
      const detail = json.errors?.[0] ?? json.code_message;
      return NextResponse.json({ ok: false, error: detail }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      count: json.data_count,
      licencas: json.data.map((d) => ({
        bairro: d.bairro ?? "",
        complemento: d.complemento ?? "",
        endereco: d.endereco ?? "",
        municipio: d.municipio ?? "",
        numeroLicenca: d.numero_licensa ?? "",
        ocupacao: d.ocupacao ?? "",
        situacao: d.situacao ?? "",
        tipoLicenca: d.tipo_licenca ?? "",
        siteReceipt: d.site_receipt ?? "",
      })),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Falha ao consultar a API de licenças do Corpo de Bombeiros." },
      { status: 502 },
    );
  }
}
