import { createClient } from "@/lib/supabase/client";
import type { TeamMember, UserRole } from "@/types/team";

interface TeamMemberRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  created_at: string;
}

function mapRowToMember(row: TeamMemberRow): TeamMember {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    ativo: row.ativo,
    createdAt: row.created_at,
  };
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data as TeamMemberRow[]).map(mapRowToMember);
}

/** Perfil do usuário logado. Null quando não há sessão. */
export async function fetchCurrentMember(): Promise<TeamMember | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRowToMember(data as TeamMemberRow) : null;
}

/**
 * Alterar `role` só acontece por esta RPC — a coluna não tem GRANT de UPDATE,
 * justamente para um colaborador não conseguir se promover pelo navegador.
 * A função valida is_admin() e impede o admin de se auto-rebaixar.
 */
export async function setMemberRole(targetId: string, role: UserRole): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_member_role", { target: targetId, new_role: role });
  if (error) throw error;
}

/**
 * Cria o acesso de alguém e redefine senha. Passam pela rota de servidor porque
 * a API de admin do Supabase exige a service role key — ver
 * app/api/equipe/route.ts para o porquê de não dar para fazer no navegador.
 */
async function chamarRotaEquipe(corpo: Record<string, unknown>): Promise<{ userId?: string }> {
  const resposta = await fetch("/api/equipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  const dados = (await resposta.json()) as { error?: string; userId?: string };
  if (!resposta.ok) throw new Error(dados.error ?? "Não foi possível concluir.");
  return dados;
}

export async function criarAcesso(input: {
  fullName: string;
  email: string;
  senha: string;
  role: UserRole;
}): Promise<void> {
  const { userId } = await chamarRotaEquipe({
    acao: "criar",
    fullName: input.fullName,
    email: input.email,
    senha: input.senha,
  });

  // O gatilho `handle_new_user` sempre cria como colaborador; promover é uma
  // segunda chamada, pela RPC que valida is_admin() no banco. Manter o perfil
  // fora da rota de criação evita um segundo caminho de promoção.
  if (input.role === "admin" && userId) {
    await setMemberRole(userId, "admin");
  }
}

export async function redefinirSenha(userId: string, senha: string): Promise<void> {
  await chamarRotaEquipe({ acao: "redefinir_senha", userId, senha });
}

/**
 * Desativar não é só apagar um `ativo` na tabela: o que barra a pessoa é o ban
 * do usuário no Auth, e isso só a service role faz. A coluna anda junto (é o que
 * esta tela lê), mas quem manda é o ban — ver app/api/equipe/route.ts.
 */
export async function definirAtivo(userId: string, ativo: boolean): Promise<void> {
  await chamarRotaEquipe({ acao: "definir_ativo", userId, ativo });
}

/**
 * Único campo de `team_members` com GRANT de UPDATE para `authenticated`. Quem
 * decide de quem é a linha é a RLS: a própria (`team_members_update_self`) ou
 * qualquer uma, se for admin (`team_members_update_admin`). `role` e `ativo`
 * ficam de fora do grant de propósito e têm caminhos próprios.
 */
export async function updateMemberName(id: string, fullName: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("team_members").update({ full_name: fullName }).eq("id", id);
  if (error) throw error;
}
