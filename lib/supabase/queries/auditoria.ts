import { createClient } from "@/lib/supabase/client";
import type { AuditEntry, AuditFiltro, AuditAcao } from "@/types/auditoria";

interface AuditRow {
  id: number;
  tabela: string;
  registro_id: string | null;
  acao: AuditAcao;
  member_id: string | null;
  rotulo: string | null;
  dados: Record<string, unknown> | null;
  created_at: string;
}

function mapRowToEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    tabela: row.tabela,
    registroId: row.registro_id,
    acao: row.acao,
    memberId: row.member_id,
    rotulo: row.rotulo,
    dados: row.dados,
    createdAt: row.created_at,
  };
}

/**
 * O log filtrado. A RLS só devolve linhas para admin — um colaborador recebe
 * lista vazia em vez de erro, e a tela nem é oferecida a ele.
 *
 * O teto de 500 existe pelo mesmo motivo do `.limit(200)` de `fetchNotificacoes`:
 * esta tabela cresce sem parar e ninguém precisa do histórico inteiro para ver o
 * que aconteceu no mês.
 */
export async function fetchAuditLog(filtro: AuditFiltro): Promise<AuditEntry[]> {
  const supabase = createClient();
  let query = supabase
    .from("audit_log")
    .select("*")
    .gte("created_at", filtro.desde)
    .order("created_at", { ascending: false })
    .limit(500);

  if (filtro.memberId) query = query.eq("member_id", filtro.memberId);
  if (filtro.tabela) query = query.eq("tabela", filtro.tabela);
  if (filtro.acao) query = query.eq("acao", filtro.acao);

  const { data, error } = await query;
  if (error) throw error;
  return (data as AuditRow[]).map(mapRowToEntry);
}
