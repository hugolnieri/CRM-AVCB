import { NextResponse } from "next/server";
import { normalizeCnpj } from "@/lib/cnpj";
import type { ReceitaData } from "@/types/receita";

/**
 * Fetches official company data from BrasilAPI (public CNPJ data sourced from
 * the Receita Federal) — free, no API key. Done server-side mainly to normalize
 * the large response into the small subset we store/show, dropping the `qsa`
 * (partners') personal data.
 */

interface BrasilApiCnpj {
  razao_social?: string;
  nome_fantasia?: string;
  cnae_fiscal_descricao?: string;
  descricao_situacao_cadastral?: string;
  data_inicio_atividade?: string;
  ddd_telefone_1?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  message?: string;
}

function buildEndereco(d: BrasilApiCnpj): string | null {
  const parts = [
    [d.logradouro, d.numero].filter(Boolean).join(", "),
    d.bairro,
    [d.municipio, d.uf].filter(Boolean).join(" - "),
    d.cep,
  ].filter((p) => p && p.trim() !== "");
  return parts.length > 0 ? parts.join(", ") : null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const cnpj = normalizeCnpj(body?.cnpj);

  if (!cnpj) {
    return NextResponse.json(
      { ok: false, error: "CNPJ inválido. Informe os 14 dígitos." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      next: { revalidate: 86400 },
    });

    if (res.status === 404) {
      return NextResponse.json({ ok: false, error: "CNPJ não encontrado." }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "Falha ao consultar os dados da Receita." },
        { status: 502 },
      );
    }

    const d = (await res.json()) as BrasilApiCnpj;

    const data: ReceitaData = {
      razaoSocial: d.razao_social ?? null,
      nomeFantasia: d.nome_fantasia ?? null,
      cnae: d.cnae_fiscal_descricao ?? null,
      situacaoCadastral: d.descricao_situacao_cadastral ?? null,
      dataInicioAtividade: d.data_inicio_atividade ?? null,
      telefone: d.ddd_telefone_1 ? d.ddd_telefone_1 : null,
      email: d.email ?? null,
      endereco: buildEndereco(d),
      consultadoEm: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, cnpj, data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erro ao consultar os dados da Receita." },
      { status: 502 },
    );
  }
}
