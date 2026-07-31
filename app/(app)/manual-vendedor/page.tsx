"use client";

import { useState } from "react";
import { Badge, Card, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useTiposServico } from "@/hooks/useServicos";
import { DetailModal } from "@/components/shared/DetailModal";
import { CATEGORIA_LABELS, rotuloTipo, type CategoriaServico, type TipoServico } from "@/types/servico";

/**
 * Material de venda por tipo do catálogo -- não é tela de cadastro. Quem edita
 * o texto é o admin, na aba Catálogo; aqui é só leitura, para o vendedor
 * consultar antes de ligar.
 *
 * A lista mostra só o nome: quem chega aqui está procurando um serviço
 * específico, e despejar o argumento de venda inteiro de cada um na mesma tela
 * transforma a busca em rolagem. O detalhe abre no clique. Tipo sem material
 * aparece na lista mesmo assim, com a lacuna à mostra no detalhe, em vez de
 * sumir -- some da lista seria esconder do admin que falta preencher.
 */
export default function ManualVendedorPage() {
  const { data: tipos, isLoading } = useTiposServico();
  const [aberto, setAberto] = useState<TipoServico | null>(null);

  if (isLoading) return <Loader />;

  const ativos = (tipos ?? []).filter((tipo) => tipo.ativo);
  const treinamentos = ativos.filter((tipo) => tipo.categoria === "treinamento");
  const servicos = ativos.filter((tipo) => tipo.categoria === "servico");

  return (
    <Stack>
      <div>
        <Title order={2}>Manual do Vendedor</Title>
        <Text size="sm" c="dimmed">
          Clique em um item para ver os argumentos de venda. Editado pelo admin em
          Administração → Catálogo.
        </Text>
      </div>

      <SecaoCategoria categoria="treinamento" tipos={treinamentos} onAbrir={setAberto} />
      <SecaoCategoria categoria="servico" tipos={servicos} onAbrir={setAberto} />

      {ativos.length === 0 && (
        <Text size="sm" c="dimmed">
          Nenhum item ativo no catálogo ainda.
        </Text>
      )}

      <DetailModal
        record={aberto}
        title={(tipo) => rotuloTipo(tipo)}
        onClose={() => setAberto(null)}
      >
        {(tipo) => <DetalheTipo tipo={tipo} />}
      </DetailModal>
    </Stack>
  );
}

function SecaoCategoria({
  categoria,
  tipos,
  onAbrir,
}: {
  categoria: CategoriaServico;
  tipos: TipoServico[];
  onAbrir: (tipo: TipoServico) => void;
}) {
  if (tipos.length === 0) return null;

  return (
    <Stack gap="xs">
      <Title order={4}>{CATEGORIA_LABELS[categoria]}s</Title>
      {tipos.map((tipo) => (
        <Card
          key={tipo.id}
          withBorder
          padding="sm"
          radius="md"
          onClick={() => onAbrir(tipo)}
          style={{ cursor: "pointer" }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Text fw={500} size="sm">
              {rotuloTipo(tipo)}
            </Text>
            <IconChevronRight size={16} opacity={0.5} />
          </Group>
        </Card>
      ))}
    </Stack>
  );
}

function DetalheTipo({ tipo }: { tipo: TipoServico }) {
  return (
    <Stack gap="sm">
      <Group gap={4}>
        <Badge variant="light" color="gray">
          {CATEGORIA_LABELS[tipo.categoria]}
        </Badge>
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

      {tipo.materialVenda ? (
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {tipo.materialVenda}
        </Text>
      ) : (
        <Text size="sm" c="dimmed" fs="italic">
          Sem material cadastrado ainda -- edite em Administração → Catálogo.
        </Text>
      )}
    </Stack>
  );
}
