"use client";

import { Accordion, Anchor, Badge, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { useTiposServico } from "@/hooks/useServicos";
import { CATEGORIA_LABELS, rotuloTipo, type CategoriaServico, type TipoServico } from "@/types/servico";

/**
 * Material de venda por tipo do catálogo -- não é tela de cadastro. Quem edita
 * o texto é o admin, na aba Catálogo; aqui é só leitura, para o vendedor
 * consultar antes de ligar.
 *
 * Accordion e não modal: a lista fechada mostra só os nomes, porque quem chega
 * aqui procura um serviço específico e o argumento inteiro de cada um na mesma
 * tela transforma a busca em rolagem. Aberto, o detalhe fica ao lado dos outros
 * nomes e recolhe no mesmo clique -- um modal obrigaria a fechar para voltar à
 * lista. `multiple` porque comparar dois treinamentos é caso real.
 *
 * Tipo sem material aparece na lista mesmo assim, com a lacuna à mostra no
 * detalhe: sumir da lista esconderia do admin que falta preencher.
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
          Clique em um item para abrir os argumentos de venda, e de novo para recolher. Editado
          pelo admin em Administração → Catálogo.
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
    <Stack gap="xs">
      <Title order={4}>{CATEGORIA_LABELS[categoria]}s</Title>
      <Accordion variant="separated" multiple chevronPosition="right">
        {tipos.map((tipo) => (
          <Accordion.Item key={tipo.id} value={tipo.id}>
            <Accordion.Control>
              <Text fw={500} size="sm">
                {rotuloTipo(tipo)}
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <DetalheTipo tipo={tipo} />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  );
}

/**
 * Apresentações prontas para mandar ao cliente, por sigla do catálogo.
 *
 * Mapa chumbado enquanto existe uma página só: generalizar pediria uma coluna
 * `slug` em `tipos_servico`, e não vale criar schema para um piloto que ainda
 * está sendo avaliado. Sigla sem entrada aqui simplesmente não mostra o link.
 */
const APRESENTACAO_POR_SIGLA: Record<string, string> = {
  "NR-35": "/lp/nr-35",
};

function DetalheTipo({ tipo }: { tipo: TipoServico }) {
  const apresentacao = tipo.sigla ? APRESENTACAO_POR_SIGLA[tipo.sigla] : undefined;

  return (
    <Stack gap="sm">
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

      {tipo.materialVenda ? (
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {tipo.materialVenda}
        </Text>
      ) : (
        <Text size="sm" c="dimmed" fs="italic">
          Sem material cadastrado ainda -- edite em Administração → Catálogo.
        </Text>
      )}

      {apresentacao && (
        <Anchor href={apresentacao} target="_blank" size="sm">
          <Group gap={4} wrap="nowrap">
            <IconExternalLink size={14} />
            Abrir apresentação para o cliente
          </Group>
        </Anchor>
      )}
    </Stack>
  );
}
