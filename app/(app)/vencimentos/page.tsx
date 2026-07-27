"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Card,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconCertificate, IconTool } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useClientes } from "@/hooks/useClientes";
import { useTreinamentos } from "@/hooks/useTreinamentos";
import { useServicos } from "@/hooks/useServicos";
import { SearchInput } from "@/components/shared/SearchInput";
import { matchesQuery } from "@/lib/search";
import {
  VENCIMENTO_BUCKETS,
  agruparPorBucket,
  itensVenciveis,
  type ItemVencivel,
  type VencimentoBucket,
} from "@/lib/vencimentos";

/** Baldes exibidos por padrão. "futuro" fica de fora: não é o que exige ação. */
const BUCKETS_VISIVEIS: VencimentoBucket[] = ["vencido", "esta_semana", "este_mes"];

export default function VencimentosPage() {
  const router = useRouter();
  const { data: treinamentos, isLoading } = useTreinamentos();
  const { data: servicos } = useServicos();
  const { data: clientes } = useClientes();
  const [search, setSearch] = useState("");
  const [origem, setOrigem] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const itens = itensVenciveis(treinamentos ?? [], servicos ?? [], clientes ?? []).filter(
      (i) =>
        (!origem || i.origem === origem) && matchesQuery([i.clienteNome, i.descricao], search),
    );
    return agruparPorBucket(itens);
  }, [treinamentos, servicos, clientes, search, origem]);

  const totalVisivel = BUCKETS_VISIVEIS.reduce((sum, b) => sum + grupos[b].length, 0);

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Title order={2}>Controle de vencimentos</Title>
      <Text c="dimmed" size="sm">
        Treinamentos com data de vencimento e serviços com próxima data agendada. Clique num item
        para abrir o cliente.
      </Text>

      <Group align="flex-end" wrap="wrap">
        <div style={{ flex: "1 1 280px" }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por cliente ou item..." />
        </div>
        <Select
          label="Tipo"
          placeholder="Todos"
          clearable
          data={[
            { value: "treinamento", label: "Treinamentos" },
            { value: "servico", label: "Serviços" },
          ]}
          value={origem}
          onChange={setOrigem}
          style={{ flex: "0 1 200px" }}
        />
      </Group>

      {totalVisivel === 0 && (
        <Paper withBorder p="lg" radius="md">
          <Text c="dimmed">
            Nada vencendo nos próximos 30 dias. {grupos.futuro.length > 0 &&
              `${grupos.futuro.length} ${grupos.futuro.length === 1 ? "item vence" : "itens vencem"} mais adiante.`}
          </Text>
        </Paper>
      )}

      {BUCKETS_VISIVEIS.map((bucket) => {
        const itens = grupos[bucket];
        if (itens.length === 0) return null;
        const meta = VENCIMENTO_BUCKETS.find((b) => b.value === bucket);

        return (
          <Stack key={bucket} gap="xs">
            <Group gap="xs">
              <Title order={4} c={meta?.color}>
                {meta?.label}
              </Title>
              <Badge color={meta?.color} variant="light">
                {itens.length}
              </Badge>
            </Group>
            {itens.map((item) => (
              <VencimentoCard
                key={`${item.origem}-${item.id}`}
                item={item}
                color={meta?.color}
                onClick={() => router.push(`/clientes/${item.clienteId}`)}
              />
            ))}
          </Stack>
        );
      })}
    </Stack>
  );
}

function VencimentoCard({
  item,
  color,
  onClick,
}: {
  item: ItemVencivel;
  color?: string;
  onClick: () => void;
}) {
  const dias = dayjs(item.dataVencimento).diff(dayjs().startOf("day"), "day");

  return (
    <Card withBorder padding="sm" radius="md" onClick={onClick} style={{ cursor: "pointer" }}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          {item.origem === "treinamento" ? (
            <IconCertificate size={18} />
          ) : (
            <IconTool size={18} />
          )}
          <div>
            <Text fw={500} size="sm">
              {item.clienteNome}
            </Text>
            <Text size="xs" c="dimmed">
              {item.descricao}
            </Text>
          </div>
        </Group>
        <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
          <Text size="sm" fw={500} c={color}>
            {dayjs(item.dataVencimento).format("DD/MM/YYYY")}
          </Text>
          <Text size="xs" c="dimmed">
            {dias < 0
              ? `há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`
              : dias === 0
                ? "hoje"
                : `em ${dias} ${dias === 1 ? "dia" : "dias"}`}
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}
