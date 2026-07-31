"use client";

import { Accordion, Anchor, Badge, Divider, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconExternalLink, IconPaperclip } from "@tabler/icons-react";
import { useTiposServico } from "@/hooks/useServicos";
import { useMateriaisVenda } from "@/hooks/useMateriaisVenda";
import { MateriaisLista } from "@/components/shared/MateriaisVenda";
import {
  CATEGORIA_LABELS,
  rotuloTipo,
  type CategoriaServico,
  type MaterialVenda,
  type TipoServico,
} from "@/types/servico";

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
  const { data: materiais } = useMateriaisVenda();

  if (isLoading) return <Loader />;

  const ativos = (tipos ?? []).filter((tipo) => tipo.ativo);
  const treinamentos = ativos.filter((tipo) => tipo.categoria === "treinamento");
  const servicos = ativos.filter((tipo) => tipo.categoria === "servico");
  const arquivos = materiais ?? [];

  return (
    <Stack>
      <div>
        <Title order={2}>Manual do Vendedor</Title>
        <Text size="sm" c="dimmed">
          Clique em um item para abrir os argumentos de venda, e de novo para recolher. Editado
          pelo admin em Administração → Catálogo.
        </Text>
      </div>

      <SecaoCategoria categoria="treinamento" tipos={treinamentos} materiais={arquivos} />
      <SecaoCategoria categoria="servico" tipos={servicos} materiais={arquivos} />

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
  materiais,
}: {
  categoria: CategoriaServico;
  tipos: TipoServico[];
  materiais: MaterialVenda[];
}) {
  if (tipos.length === 0) return null;

  return (
    <Stack gap="xs">
      <Title order={4}>{CATEGORIA_LABELS[categoria]}s</Title>
      <Accordion variant="separated" multiple chevronPosition="right">
        {tipos.map((tipo) => {
          const doTipo = materiais.filter((m) => m.tipoServicoId === tipo.id);
          return (
            <Accordion.Item key={tipo.id} value={tipo.id}>
              <Accordion.Control>
                <Group gap="xs" wrap="nowrap">
                  <Text fw={500} size="sm">
                    {rotuloTipo(tipo)}
                  </Text>
                  {/* O clipe fechado avisa que há arquivo antes de abrir: quem
                      procura a apostila não precisa expandir item por item. */}
                  {doTipo.length > 0 && (
                    <Badge variant="light" size="sm" color="gray" leftSection={<IconPaperclip size={11} />}>
                      {doTipo.length}
                    </Badge>
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <DetalheTipo tipo={tipo} materiais={doTipo} />
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
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
const APRESENTACOES_POR_SIGLA: Record<string, { href: string; rotulo: string }[]> = {
  "NR-35": [
    { href: "/lp/nr-35", rotulo: "Abrir apresentação para o cliente — versão Claude" },
    { href: "/lp/nr-35-codex", rotulo: "Abrir apresentação para o cliente — versão Codex" },
  ],
};

function DetalheTipo({ tipo, materiais }: { tipo: TipoServico; materiais: MaterialVenda[] }) {
  const apresentacoes = tipo.sigla ? APRESENTACOES_POR_SIGLA[tipo.sigla] : undefined;
  const semNada = !tipo.materialVenda && materiais.length === 0;

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

      {tipo.materialVenda && (
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {tipo.materialVenda}
        </Text>
      )}

      {materiais.length > 0 && (
        <>
          {tipo.materialVenda && <Divider />}
          <MateriaisLista materiais={materiais} />
        </>
      )}

      {semNada && (
        <Text size="sm" c="dimmed" fs="italic">
          Sem material cadastrado ainda -- anexe um arquivo ou escreva o roteiro em Administração →
          Catálogo.
        </Text>
      )}

      {apresentacoes && (
        <Stack gap={4}>
          {apresentacoes.map((apresentacao) => (
            <Anchor key={apresentacao.href} href={apresentacao.href} target="_blank" size="sm">
              <Group gap={4} wrap="nowrap">
                <IconExternalLink size={14} />
                {apresentacao.rotulo}
              </Group>
            </Anchor>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
