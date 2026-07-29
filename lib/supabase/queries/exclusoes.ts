import { createClient } from "@/lib/supabase/client";
import { deleteLead } from "@/lib/supabase/queries/leads";
import { deleteCliente } from "@/lib/supabase/queries/clientes";
import type {
  EntidadeExcluivel,
  SolicitacaoExclusao,
  SolicitacaoStatus,
} from "@/types/exclusao";

interface SolicitacaoRow {
  id: string;
  entidade: EntidadeExcluivel;
  registro_id: string;
  rotulo: string;
  motivo: string | null;
  status: SolicitacaoStatus;
  solicitado_por: string | null;
  decidido_por: string | null;
  decidido_em: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToSolicitacao(row: SolicitacaoRow): SolicitacaoExclusao {
  return {
    id: row.id,
    entidade: row.entidade,
    registroId: row.registro_id,
    rotulo: row.rotulo,
    motivo: row.motivo,
    status: row.status,
    solicitadoPor: row.solicitado_por,
    decididoPor: row.decidido_por,
    decididoEm: row.decidido_em,
    observacao: row.observacao,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchSolicitacoes(): Promise<SolicitacaoExclusao[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("solicitacoes_exclusao")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data as SolicitacaoRow[]).map(mapRowToSolicitacao);
}

/**
 * Registra o pedido. A RLS exige `solicitado_por = auth.uid()`, então ninguém
 * pede em nome de outro; e o índice único parcial impede dois pedidos pendentes
 * para o mesmo registro.
 */
export async function solicitarExclusao(input: {
  entidade: EntidadeExcluivel;
  registroId: string;
  rotulo: string;
  motivo: string | null;
}): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");

  const { error } = await supabase.from("solicitacoes_exclusao").insert({
    entidade: input.entidade,
    registro_id: input.registroId,
    rotulo: input.rotulo,
    motivo: input.motivo,
    solicitado_por: user.id,
  });

  if (error) throw error;
}

/**
 * Aprova e executa.
 *
 * A ordem importa: **apaga primeiro, marca depois**. Não há transação pelo
 * PostgREST, então um dos dois passos pode falhar sozinho. Falhar depois do
 * delete deixa um pedido pendente apontando para registro que já não existe —
 * visível, corrigível, e o `audit_log` guarda a exclusão de qualquer forma.
 * Falhar na ordem inversa deixaria um pedido marcado como "aprovada" para um
 * registro que continua lá, que é uma mentira no histórico.
 */
export async function aprovarExclusao(solicitacao: SolicitacaoExclusao): Promise<void> {
  if (solicitacao.entidade === "lead") {
    await deleteLead(solicitacao.registroId);
  } else {
    await deleteCliente(solicitacao.registroId);
  }

  await decidir(solicitacao.id, "aprovada", null);
}

export async function recusarExclusao(id: string, observacao: string | null): Promise<void> {
  return decidir(id, "recusada", observacao);
}

/** Restrito a admin pela RLS; um colaborador recebe 0 linhas afetadas. */
async function decidir(
  id: string,
  status: Exclude<SolicitacaoStatus, "pendente">,
  observacao: string | null,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("solicitacoes_exclusao")
    .update({
      status,
      observacao,
      decidido_por: user?.id ?? null,
      decidido_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}
