"use client";

import { useMemo, useState } from "react";
import { Group, Loader, Select, Stack, Text, Title } from "@mantine/core";
import { useClientes } from "@/hooks/useClientes";
import { useServicos, useTiposServico } from "@/hooks/useServicos";
import { useTeamMembers } from "@/hooks/useCurrentMember";
import { ServicosPanel } from "@/components/servicos/ServicosPanel";
import { SearchInput } from "@/components/shared/SearchInput";
import { matchesQuery } from "@/lib/search";
import { VENCIMENTO_BUCKETS, vencimentoBucket } from "@/lib/vencimentos";
import { nomeCliente } from "@/types/cliente";
import { CATEGORIA_LABELS, SERVICO_STATUS_LABELS } from "@/types/servico";

/**
 * Lista completa de serviços. Fora do menu principal de propósito — o caminho
 * normal é pelo cliente ou pela Agenda; esta tela existe para quando se quer
 * varrer tudo (ex.: "o que vence este mês em toda a carteira").
 */
export default function ServicosPage() {
  const { data: servicos, isLoading, error } = useServicos();
  const { data: clientes } = useClientes();
  const { data: membros } = useTeamMembers();
  const { data: tipos } = useTiposServico();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [bucket, setBucket] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    if (!servicos) return [];
    const nomePorId = new Map((clientes ?? []).map((c) => [c.id, nomeCliente(c)]));
    const categoriaPorTipo = new Map((tipos ?? []).map((t) => [t.id, t.categoria]));

    return servicos.filter((s) => {
      if (status && s.status !== status) return false;
      if (categoria) {
        const cat = s.tipoServicoId ? categoriaPorTipo.get(s.tipoServicoId) : undefined;
        if (cat !== categoria) return false;
      }
      if (bucket) {
        if (!s.dataVencimento) return false;
        if (vencimentoBucket(s.dataVencimento) !== bucket) return false;
      }
      return matchesQuery(
        [s.tipoNome, nomePorId.get(s.clienteId), s.instrutor, s.observacoes],
        search,
      );
    });
  }, [servicos, clientes, tipos, search, status, categoria, bucket]);

  return (
    <Stack>
      <Title order={2}>Serviços e treinamentos</Title>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar serviços.</Text>}

      {servicos && (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por serviço, cliente, instrutor..."
          />
          <Group align="flex-end" wrap="wrap">
            <Select
              label="Situação"
              placeholder="Todas"
              clearable
              data={Object.entries(SERVICO_STATUS_LABELS).map(([value, meta]) => ({
                value,
                label: meta.label,
              }))}
              value={status}
              onChange={setStatus}
              style={{ flex: "1 1 160px" }}
            />
            <Select
              label="Natureza"
              placeholder="Todas"
              clearable
              data={Object.entries(CATEGORIA_LABELS).map(([value, label]) => ({ value, label }))}
              value={categoria}
              onChange={setCategoria}
              style={{ flex: "1 1 160px" }}
            />
            <Select
              label="Vencimento"
              placeholder="Todos"
              clearable
              data={VENCIMENTO_BUCKETS.map((b) => ({ value: b.value, label: b.label }))}
              value={bucket}
              onChange={setBucket}
              style={{ flex: "1 1 200px" }}
            />
          </Group>

          <ServicosPanel
            servicos={filtrados}
            clientes={clientes ?? []}
            membros={membros ?? []}
            tipos={tipos ?? []}
          />
        </>
      )}
    </Stack>
  );
}
