"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Alert,
  Badge,
  Card,
  Drawer,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconMapPinOff } from "@tabler/icons-react";
import { StageBadge } from "@/components/leads/StageBadge";
import { useCidades, useGeocodificacao } from "@/hooks/useCidades";
import { agruparPorCidade, corDoGrupo, type GrupoCidade } from "@/lib/mapa";
import type { Lead } from "@/types/lead";

/**
 * Leaflet toca `window` já na importação do módulo, então precisa ficar fora do
 * bundle do servidor — sem `ssr: false` o build quebra.
 */
const MapaCidades = dynamic(
  () => import("@/components/leads/MapaCidades").then((m) => m.MapaCidades),
  { ssr: false, loading: () => <Skeleton height={520} radius="md" /> },
);

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/**
 * O pipeline por geografia: uma bolha por cidade, do tamanho da carteira dali.
 * Responde a pergunta que nem o kanban nem a lista respondem — onde vale a pena
 * pegar a estrada, e o que mais visitar no mesmo dia.
 */
export function PipelineMapa({
  leads,
  onLeadClick,
}: {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}) {
  const { grupos, semCidade } = useMemo(() => agruparPorCidade(leads), [leads]);
  const { data: cidades, isLoading } = useCidades();
  const { pendentes } = useGeocodificacao(grupos);
  const [selecionada, setSelecionada] = useState<GrupoCidade | null>(null);

  // Cidade que o cache já tentou e não achou: quase sempre erro de digitação.
  const semLocalizacao = useMemo(() => {
    if (!cidades) return [];
    const porChave = new Map(cidades.map((c) => [c.chave, c]));
    return grupos.filter((g) => {
      const cidade = porChave.get(g.chave);
      return cidade !== undefined && cidade.lat === null;
    });
  }, [grupos, cidades]);

  if (isLoading) return <Loader />;

  return (
    <>
      <Group align="flex-start" gap="md" wrap="nowrap" style={{ flexWrap: "wrap" }}>
        <Paper withBorder p={4} radius="md" style={{ flex: "1 1 480px", minWidth: 300 }}>
          <MapaCidades grupos={grupos} cidades={cidades ?? []} onCidadeClick={setSelecionada} />
        </Paper>

        <Stack gap="xs" style={{ flex: "1 1 260px", minWidth: 260 }}>
          <Title order={5}>Cidades</Title>

          {pendentes > 0 && (
            <Text size="xs" c="dimmed">
              Localizando {pendentes} {pendentes === 1 ? "cidade nova" : "cidades novas"}…
              atualize em alguns segundos.
            </Text>
          )}

          {grupos.length === 0 && <Text c="dimmed">Nenhum lead com cidade preenchida.</Text>}

          <ScrollArea.Autosize mah={430}>
            <Stack gap={6}>
              {grupos.map((grupo) => (
                <Card
                  key={grupo.chave}
                  withBorder
                  padding="xs"
                  radius="md"
                  onClick={() => setSelecionada(grupo)}
                  style={{
                    cursor: "pointer",
                    borderLeft: `3px solid var(--mantine-color-${corDoGrupo(grupo)}-6)`,
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" fw={500} lineClamp={1}>
                      {grupo.nome}
                      {grupo.uf && (
                        <Text span size="xs" c="dimmed">
                          {" "}
                          / {grupo.uf}
                        </Text>
                      )}
                    </Text>
                    <Badge variant="light" color={corDoGrupo(grupo)} style={{ flexShrink: 0 }}>
                      {grupo.total}
                    </Badge>
                  </Group>
                  {grupo.valor > 0 && (
                    <Text size="xs" c="dimmed">
                      {moeda(grupo.valor)}
                    </Text>
                  )}
                </Card>
              ))}
            </Stack>
          </ScrollArea.Autosize>

          {(semLocalizacao.length > 0 || semCidade.length > 0) && (
            <Alert
              color="gray"
              variant="light"
              icon={<IconMapPinOff size={16} />}
              title="Sem localização"
            >
              <Stack gap={4}>
                {semLocalizacao.map((grupo) => (
                  <Text
                    key={grupo.chave}
                    size="xs"
                    onClick={() => setSelecionada(grupo)}
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                  >
                    {grupo.nome}
                    {grupo.uf && ` / ${grupo.uf}`} ({grupo.total}) — não encontrada no mapa
                  </Text>
                ))}
                {semCidade.length > 0 && (
                  <Text size="xs">
                    {semCidade.length} {semCidade.length === 1 ? "lead" : "leads"} sem cidade
                    preenchida.
                  </Text>
                )}
              </Stack>
            </Alert>
          )}
        </Stack>
      </Group>

      <Drawer
        opened={selecionada !== null}
        onClose={() => setSelecionada(null)}
        position="right"
        title={
          selecionada && (
            <div>
              <Title order={4}>
                {selecionada.nome}
                {selecionada.uf && ` / ${selecionada.uf}`}
              </Title>
              <Text size="sm" c="dimmed">
                {selecionada.total} {selecionada.total === 1 ? "lead" : "leads"}
                {selecionada.valor > 0 && ` · ${moeda(selecionada.valor)}`}
              </Text>
            </div>
          )
        }
      >
        <Stack gap="xs">
          {selecionada?.leads.map((lead) => (
            <Card
              key={lead.id}
              withBorder
              padding="sm"
              radius="md"
              onClick={() => {
                setSelecionada(null);
                onLeadClick(lead);
              }}
              style={{ cursor: "pointer" }}
            >
              <Group justify="space-between" wrap="nowrap" mb={4}>
                <Text size="sm" fw={500} lineClamp={1}>
                  {lead.name}
                </Text>
                {lead.valorEstimado !== null && (
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {moeda(lead.valorEstimado)}
                  </Text>
                )}
              </Group>
              <StageBadge stage={lead.pipelineStage} />
            </Card>
          ))}
        </Stack>
      </Drawer>
    </>
  );
}
