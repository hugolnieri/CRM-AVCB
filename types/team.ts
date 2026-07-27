/**
 * `admin` mantém o catálogo de tipos de treinamento, altera perfis dos outros e
 * é o único que pode excluir registros. `colaborador` faz todo o resto — o dia a
 * dia de leads, clientes, treinamentos e serviços.
 *
 * Isto é aplicado no banco (ver supabase/migrations/0002_auth_rls.sql), não só na
 * interface: esconder o menu é conveniência, a policy é a barreira.
 */
export type UserRole = "admin" | "colaborador";

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  createdAt: string;
}
