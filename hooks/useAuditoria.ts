import { useQuery } from "@tanstack/react-query";
import { fetchAuditLog } from "@/lib/supabase/queries/auditoria";
import type { AuditFiltro } from "@/types/auditoria";

/**
 * O log filtrado. A RLS só devolve linhas para admin, então esta query é segura
 * de montar em qualquer lugar — mas só a aba de Registro a usa.
 */
export function useAuditLog(filtro: AuditFiltro) {
  return useQuery({
    queryKey: ["auditLog", filtro.desde, filtro.memberId, filtro.tabela, filtro.acao],
    queryFn: () => fetchAuditLog(filtro),
  });
}
