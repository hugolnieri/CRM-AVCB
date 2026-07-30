"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the client in sync with the Supabase session. The access token expires
 * after ~1h; when the tab has been idle/backgrounded the browser can throttle
 * the auto-refresh timer, so the token lapses. Without handling this, the next
 * navigation silently fails (the proxy can't authenticate the RSC request and
 * the click appears to do nothing — the "menu para de funcionar" symptom).
 *
 * Também é aqui que o cache do TanStack Query é descartado ao trocar de
 * usuário. Sem isso quem entra herda as respostas de quem saiu: `useCurrentMember`
 * tem `staleTime` e entrega o valor em cache antes de revalidar, então um
 * colaborador logando na sequência de um admin veria por alguns instantes o menu
 * de Administração, o sino com avisos de admin e os botões de excluir. É
 * vazamento de interface — a RLS barra a escrita de qualquer forma — mas mostra
 * a alguém uma permissão que ele não tem.
 */
export function AuthListener() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Quem o cache atual representa. Distingue "outra pessoa entrou" de "a mesma
  // sessão foi reestabelecida".
  const usuarioDoCache = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
        // Deixa rastro de QUAL evento derrubou a sessão. Existe porque houve um
        // caso reproduzível em produção e não em desenvolvimento: sem saber se
        // veio um `SIGNED_OUT` do servidor ou uma renovação que voltou sem
        // sessão, qualquer correção seria chute. Sai pelo console de propósito —
        // é a única superfície que a pessoa afetada consegue capturar sozinha.
        console.warn(
          `[auth] sessão encerrada — evento: ${event}, sessão: ${session ? "presente" : "nula"}`,
        );
        usuarioDoCache.current = null;
        queryClient.clear();
        router.replace("/login");
        return;
      }

      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        const id = session?.user.id ?? null;

        // SIGNED_IN dispara toda vez que a sessão é reestabelecida, inclusive ao
        // voltar para uma aba parada. Limpar sempre provocaria uma enxurrada de
        // refetch; então só limpa quando é de fato outra pessoa.
        if (id !== null && usuarioDoCache.current !== null && id !== usuarioDoCache.current) {
          queryClient.clear();
        }
        usuarioDoCache.current = id;

        if (event !== "INITIAL_SESSION") router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  return null;
}
