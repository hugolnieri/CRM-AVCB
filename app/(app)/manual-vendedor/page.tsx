"use client";

import { Badge, Card, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { useTiposServico } from "@/hooks/useServicos";
import { CATEGORIA_LABELS, rotuloTipo, type CategoriaServico, type TipoServico } from "@/types/servico";

/**
 * Material de venda por tipo do catálogo -- não é tela de cadastro. Quem edita
 * o texto é o admin, na aba Catálogo; aqui é só leitura, para o vendedor
 * consultar antes de ligar. Tipo sem material aparece mesmo assim, com a
 * lacuna à mostra, em vez de sumir da lista.
 */
export default function ManualVendedorPage() {
  const { data: tipos, isLoading } = useTiposServico();

  if (isLoading) return <Loader />;

  const ativos = (tipos ?? []).filter((tipo) => tipo.ativo);
  const treinamentos = ativos.filter((tipo) => tipo.categoria === "treinamento");
  const servicos = ativos.filter((tipo) => tipo.categoria === "servico");

  return (
    <Stack>
      <div>
        <Title order={2}>Manual do Vendedor</Title>
        <Text size="sm" c="dimmed">
          Argumentos de venda de cada item do catálogo. Editado pelo admin em
          Administração → Catálogo.
        </Text>
      </div>

      <SecaoCategoria categoria="treinamento" tipos={treinamentos} />
      <SecaoCategoria categoria="servico" tipos={servicos} />

      {ativos.length === 0 && (
        <Text size="sm" c="dimmed">
          Nenhum item ativo no catálogo ainda.
        </Text>
      )}
    </Stack>
  );
}

function SecaoCategoria({
  categoria,
  tipos,
}: {
  categoria: CategoriaServico;
  tipos: TipoServico[];
}) {
  if (tipos.length === 0) return null;

  return (
    <Stack gap="sm">
      <Title order={4}>{CATEGORIA_LABELS[categoria]}s</Title>
      {tipos.map((tipo) => (
        <TipoCard key={tipo.id} tipo={tipo} />
      ))}
    </Stack>
  );
}

function TipoCard({ tipo }: { tipo: TipoServico }) {
  return (
    <Card withBorder padding="md">
      <Group justify="space-between" mb="xs">
        <Title order={5}>{rotuloTipo(tipo)}</Title>
        <Group gap={4}>
          {tipo.cargaHoraria && <Badge variant="light">{tipo.cargaHoraria}h</Badge>}
          {tipo.validadeMeses && (
            <Badge variant="light" color="grape">
              Validade: {tipo.validadeMeses} meses
            </Badge>
          )}
          {tipo.cnaes && tipo.cnaes.length > 0 && (
            <Badge variant="light" color="blue">
              CNAE {tipo.cnaes.join(", ")}
            </Badge>
          )}
        </Group>
      </Group>

      {tipo.materialVenda ? (
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {tipo.materialVenda}
        </Text>
      ) : (
        <Text size="sm" c="dimmed" fs="italic">
          Sem material cadastrado ainda -- edite em Administração → Catálogo.
        </Text>
      )}
    </Card>
  );
}
