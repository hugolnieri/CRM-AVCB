"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, CircleMarker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { Text, useMantineTheme } from "@mantine/core";
import { corDoGrupo, enquadrar, raioDaBolha, type GrupoCidade } from "@/lib/mapa";
import type { Cidade } from "@/types/cidade";
import "leaflet/dist/leaflet.css";

export interface GrupoLocalizado extends GrupoCidade {
  lat: number;
  lng: number;
}

/**
 * Reenquadra quando o conjunto de cidades muda — filtrar a busca de "todas" para
 * "só Sorocaba" tem de mover o mapa, senão o resultado fica fora da tela.
 * `MapContainer` só lê `center`/`zoom` na montagem, então o ajuste é imperativo.
 */
function Reenquadrar({ grupos }: { grupos: GrupoLocalizado[] }) {
  const map = useMap();
  const assinatura = grupos.map((g) => g.chave).join(",");

  useEffect(() => {
    const { centro, zoom } = enquadrar(grupos);
    map.setView(centro, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura, map]);

  return null;
}

export function MapaCidades({
  grupos,
  cidades,
  onCidadeClick,
}: {
  grupos: GrupoCidade[];
  cidades: Cidade[];
  onCidadeClick: (grupo: GrupoCidade) => void;
}) {
  const theme = useMantineTheme();

  const localizados = useMemo<GrupoLocalizado[]>(() => {
    const porChave = new Map(cidades.map((c) => [c.chave, c]));
    return grupos.flatMap((g) => {
      const cidade = porChave.get(g.chave);
      if (!cidade || cidade.lat === null || cidade.lng === null) return [];
      return [{ ...g, lat: cidade.lat, lng: cidade.lng }];
    });
  }, [grupos, cidades]);

  const maiorTotal = Math.max(0, ...localizados.map((g) => g.total));
  const { centro, zoom } = enquadrar(localizados);

  return (
    <MapContainer
      center={centro}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: 520, width: "100%", borderRadius: "var(--mantine-radius-md)", zIndex: 0 }}
    >
      <TileLayer
        // Tiles do OpenStreetMap: sem chave e sem conta. A atribuição não é
        // decorativa — é condição da licença de uso.
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Reenquadrar grupos={localizados} />

      {localizados.map((grupo) => {
        // Cor resolvida para hex aqui: Leaflet escreve stroke/fill como atributo
        // SVG, e atributo não interpreta var(--mantine-color-...).
        const hex = theme.colors[corDoGrupo(grupo)]?.[6] ?? theme.colors.blue[6];
        return (
          <CircleMarker
            key={grupo.chave}
            center={[grupo.lat, grupo.lng]}
            radius={raioDaBolha(grupo.total, maiorTotal)}
            pathOptions={{ color: hex, fillColor: hex, fillOpacity: 0.55, weight: 2 }}
            eventHandlers={{ click: () => onCidadeClick(grupo) }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <Text size="sm" fw={600}>
                {grupo.nome}
                {grupo.uf && ` / ${grupo.uf}`}
              </Text>
              <Text size="xs">
                {grupo.total} {grupo.total === 1 ? "lead" : "leads"}
                {grupo.valor > 0 &&
                  ` · ${grupo.valor.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}`}
              </Text>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
