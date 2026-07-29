import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCidades, geocodificarPendentes } from "@/lib/supabase/queries/cidades";
import type { GrupoCidade } from "@/lib/mapa";

export function useCidades() {
  return useQuery({
    queryKey: ["cidades"],
    queryFn: fetchCidades,
    // Cache de coordenada de cidade não muda; só cresce.
    staleTime: 5 * 60_000,
  });
}

/**
 * Dispara a geocodificação das cidades que ainda não estão no cache e recarrega
 * quando alguma volta com coordenada.
 *
 * "Ainda não estão" inclui só as nunca tentadas: uma cidade com `tentadaEm`
 * preenchido e `lat` nula não achou no Nominatim (quase sempre erro de
 * digitação) e não volta para a fila — senão toda abertura do mapa gastaria a
 * cota tentando geocodificar "Sorocba" de novo.
 */
export function useGeocodificacao(grupos: GrupoCidade[]) {
  const { data: cidades } = useCidades();
  const queryClient = useQueryClient();

  const pendentes = useMemo(() => {
    if (!cidades) return [];
    const conhecidas = new Set(cidades.map((c) => c.chave));
    return grupos
      .filter((g) => !conhecidas.has(g.chave))
      .map((g) => ({ chave: g.chave, nome: g.nome, uf: g.uf }));
  }, [grupos, cidades]);

  // Chave estável: sem isso o array novo a cada render reagendaria o efeito.
  const assinatura = pendentes.map((p) => p.chave).join(",");

  useEffect(() => {
    if (pendentes.length === 0) return;
    let cancelado = false;

    geocodificarPendentes(pendentes).then((quantas) => {
      if (!cancelado && quantas > 0) {
        queryClient.invalidateQueries({ queryKey: ["cidades"] });
      }
    });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura, queryClient]);

  return { pendentes: pendentes.length };
}
