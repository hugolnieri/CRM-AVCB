"use client";

import { useState } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Card,
  CloseButton,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import {
  IconCheck,
  IconChevronRight,
  IconCopy,
  IconExternalLink,
  IconPaperclip,
  IconSearch,
} from "@tabler/icons-react";
import { useTiposServico } from "@/hooks/useServicos";
import { useMateriaisVenda } from "@/hooks/useMateriaisVenda";
import { MateriaisLista } from "@/components/shared/MateriaisVenda";
import { DetailModal } from "@/components/shared/DetailModal";
import { tipoServicoMatchesQuery } from "@/lib/search";
import {
  CATEGORIA_LABELS,
  rotuloTipo,
  type CategoriaServico,
  type MaterialVenda,
  type TipoServico,
} from "@/types/servico";

/**
 * Material de venda por tipo do catálogo -- não é tela de cadastro. Quem edita
 * o texto e anexa os arquivos é o admin, na aba Catálogo; aqui é só leitura,
 * para o vendedor consultar antes de ligar.
 *
 * A lista mostra só o nome e o detalhe abre em modal: com vinte e sete itens no
 * catálogo, o argumento inteiro de cada um empilhado na mesma tela vira
 * rolagem, e o modal devolve a lista inteira intacta ao fechar.
 *
 * Tipo sem material aparece na lista mesmo assim, com a lacuna à mostra no
 * detalhe: sumir da lista esconderia do admin que falta preencher.
 */
export default function ManualVendedorPage() {
  const { data: tipos, isLoading } = useTiposServico();
  const { data: materiais } = useMateriaisVenda();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<TipoServico | null>(null);

  if (isLoading) return <Loader />;

  const arquivos = materiais ?? [];
  const arquivosDe = (tipo: TipoServico) =>
    arquivos.filter((material) => material.tipoServicoId === tipo.id);

  const encontrados = (tipos ?? [])
    .filter((tipo) => tipo.ativo)
    .filter((tipo) =>
      tipoServicoMatchesQuery(
        tipo,
        arquivosDe(tipo).map((material) => material.nome),
        busca,
      ),
    );

  const treinamentos = encontrados.filter((tipo) => tipo.categoria === "treinamento");
  const servicos = encontrados.filter((tipo) => tipo.categoria === "servico");

  return (
    <Stack>
      <div>
        <Title order={2}>Manual do Vendedor</Title>
        <Text size="sm" c="dimmed">
          Clique em um item para ver os argumentos de venda. Editado pelo admin em Administração →
          Catálogo.
        </Text>
      </div>

      <TextInput
        placeholder="Buscar por nome, assunto do roteiro ou nome do arquivo"
        leftSection={<IconSearch size={16} />}
        value={busca}
        onChange={(e) => setBusca(e.currentTarget.value)}
        rightSection={
          busca ? <CloseButton size="sm" onClick={() => setBusca("")} aria-label="Limpar busca" /> : null
        }
      />

      <SecaoCategoria
        categoria="treinamento"
        tipos={treinamentos}
        materiais={arquivos}
        onAbrir={setAberto}
      />
      <SecaoCategoria
        categoria="servico"
        tipos={servicos}
        materiais={arquivos}
        onAbrir={setAberto}
      />

      {encontrados.length === 0 && (
        <Text size="sm" c="dimmed">
          {busca
            ? `Nada encontrado para "${busca}".`
            : "Nenhum item ativo no catálogo ainda."}
        </Text>
      )}

      <DetailModal record={aberto} title={(tipo) => rotuloTipo(tipo)} onClose={() => setAberto(null)}>
        {(tipo) => <DetalheTipo tipo={tipo} materiais={arquivosDe(tipo)} />}
      </DetailModal>
    </Stack>
  );
}

function SecaoCategoria({
  categoria,
  tipos,
  materiais,
  onAbrir,
}: {
  categoria: CategoriaServico;
  tipos: TipoServico[];
  materiais: MaterialVenda[];
  onAbrir: (tipo: TipoServico) => void;
}) {
  if (tipos.length === 0) return null;

  return (
    <Stack gap="xs">
      <Title order={4}>{CATEGORIA_LABELS[categoria]}s</Title>
      {tipos.map((tipo) => {
        const anexos = materiais.filter((material) => material.tipoServicoId === tipo.id).length;
        return (
          <Card
            key={tipo.id}
            withBorder
            padding="sm"
            radius="md"
            onClick={() => onAbrir(tipo)}
            style={{ cursor: "pointer" }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                <Text fw={500} size="sm" truncate>
                  {rotuloTipo(tipo)}
                </Text>
                {/* O clipe na lista avisa que há arquivo antes de abrir: quem
                    procura a apostila não precisa entrar item por item. */}
                {anexos > 0 && (
                  <Badge
                    variant="light"
                    size="sm"
                    color="gray"
                    leftSection={<IconPaperclip size={11} />}
                  >
                    {anexos}
                  </Badge>
                )}
              </Group>
              <IconChevronRight size={16} opacity={0.5} />
            </Group>
          </Card>
        );
      })}
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
const APRESENTACOES_POR_SIGLA: Record<string, { href: string; rotulo: string }> = {
  "NR-35": { href: "/lp/nr-35", rotulo: "Apresentação para o cliente" },
};

/**
 * Copia a URL absoluta, não o caminho: o que vai para o WhatsApp precisa
 * funcionar colado direto, sem o vendedor completar o domínio de cabeça.
 * `useClipboard` já cobre o navegador sem `navigator.clipboard` (contexto sem
 * HTTPS), que é o motivo de não chamar a API direto aqui.
 */
function BotaoCopiarLink({ href }: { href: string }) {
  const clipboard = useClipboard({ timeout: 2000 });
  const url = typeof window !== "undefined" ? `${window.location.origin}${href}` : href;

  return (
    <Tooltip label={clipboard.copied ? "Copiado!" : "Copiar link"} withArrow>
      <ActionIcon
        variant={clipboard.copied ? "light" : "subtle"}
        color={clipboard.copied ? "teal" : "gray"}
        size="sm"
        onClick={() => clipboard.copy(url)}
        aria-label="Copiar link da apresentação"
      >
        {clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      </ActionIcon>
    </Tooltip>
  );
}

function DetalheTipo({ tipo, materiais }: { tipo: TipoServico; materiais: MaterialVenda[] }) {
  const apresentacao = tipo.sigla ? APRESENTACOES_POR_SIGLA[tipo.sigla] : undefined;
  const semNada = !tipo.materialVenda && materiais.length === 0;

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

      {apresentacao && (
        <>
          <Divider />
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Anchor href={apresentacao.href} target="_blank" size="sm">
              <Group gap={4} wrap="nowrap">
                <IconExternalLink size={14} />
                {apresentacao.rotulo}
              </Group>
            </Anchor>
            <BotaoCopiarLink href={apresentacao.href} />
          </Group>
        </>
      )}
    </Stack>
  );
}
