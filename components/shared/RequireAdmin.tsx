"use client";

import type { ReactNode } from "react";
import { Alert, Loader } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";

/**
 * Esconde uma tela de quem não é admin. É conveniência de interface, não
 * segurança: a barreira de verdade são as policies em
 * supabase/migrations/0002_auth_rls.sql, que barram a escrita venha ela de onde
 * vier — inclusive do console do navegador.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: member, isLoading } = useCurrentMember();

  if (isLoading) return <Loader />;

  if (member?.role !== "admin") {
    return (
      <Alert color="gray" icon={<IconLock size={18} />} title="Acesso restrito">
        Esta área é exclusiva de administradores. Peça a um administrador para liberar seu acesso.
      </Alert>
    );
  }

  return <>{children}</>;
}
