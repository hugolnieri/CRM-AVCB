import { createClient } from "@/lib/supabase/client";
import type { Cliente, ClienteInput, ClienteStatus } from "@/types/cliente";

interface ClienteRow {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  telefone_e164: string | null;
  email: string | null;
  contato_nome: string | null;
  contato_cargo: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  status: ClienteStatus;
  observacoes: string | null;
  lead_id: string | null;
  responsavel_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    telefone: row.telefone,
    telefoneE164: row.telefone_e164,
    email: row.email,
    contatoNome: row.contato_nome,
    contatoCargo: row.contato_cargo,
    endereco: row.endereco,
    cidade: row.cidade,
    uf: row.uf,
    cep: row.cep,
    status: row.status,
    observacoes: row.observacoes,
    leadId: row.lead_id,
    responsavelId: row.responsavel_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPatchToRow(patch: Partial<ClienteInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("razaoSocial" in patch) row.razao_social = patch.razaoSocial;
  if ("nomeFantasia" in patch) row.nome_fantasia = patch.nomeFantasia;
  if ("cnpj" in patch) row.cnpj = patch.cnpj;
  if ("telefone" in patch) row.telefone = patch.telefone;
  if ("telefoneE164" in patch) row.telefone_e164 = patch.telefoneE164;
  if ("email" in patch) row.email = patch.email;
  if ("contatoNome" in patch) row.contato_nome = patch.contatoNome;
  if ("contatoCargo" in patch) row.contato_cargo = patch.contatoCargo;
  if ("endereco" in patch) row.endereco = patch.endereco;
  if ("cidade" in patch) row.cidade = patch.cidade;
  if ("uf" in patch) row.uf = patch.uf;
  if ("cep" in patch) row.cep = patch.cep;
  if ("status" in patch) row.status = patch.status;
  if ("observacoes" in patch) row.observacoes = patch.observacoes;
  if ("leadId" in patch) row.lead_id = patch.leadId;
  if ("responsavelId" in patch) row.responsavel_id = patch.responsavelId;
  return row;
}

export async function fetchClientes(): Promise<Cliente[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("razao_social", { ascending: true });

  if (error) throw error;
  return (data as ClienteRow[]).map(mapRowToCliente);
}

export async function createCliente(
  input: Partial<ClienteInput> & { razaoSocial: string },
): Promise<Cliente> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...mapPatchToRow(input), razao_social: input.razaoSocial })
    .select()
    .single();

  if (error) throw error;
  return mapRowToCliente(data as ClienteRow);
}

export async function updateCliente(id: string, patch: Partial<ClienteInput>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("clientes").update(mapPatchToRow(patch)).eq("id", id);
  if (error) throw error;
}

/**
 * Não há DELETE de cliente — nem policy no banco. Treinamentos, serviços e notas
 * cascateiam a partir dele, então apagar destruiria o histórico de conformidade
 * inteiro da empresa. Cliente que saiu vira inativo e some da lista padrão.
 */
export async function inativarCliente(id: string, ativo: boolean): Promise<void> {
  return updateCliente(id, { status: ativo ? "ativo" : "inativo" });
}
