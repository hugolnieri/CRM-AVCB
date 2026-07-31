"use client";

import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  FileInput,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDownload,
  IconFileTypeDocx,
  IconFileTypePdf,
  IconPaperclip,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { urlAssinadaMaterial } from "@/lib/supabase/queries/materiaisVenda";
import { useDeleteMaterialVenda, useUploadMaterialVenda } from "@/hooks/useMateriaisVenda";
import { extensaoDe, formatarTamanho } from "@/lib/arquivos";
import { getErrorMessage } from "@/lib/errors";
import type { MaterialVenda } from "@/types/servico";

/** O que o bucket aceita (ver migration 0017) — repetido aqui só como filtro
 * do seletor de arquivo, para o admin não escolher um .zip e descobrir no erro.
 * A barreira de verdade é o `allowed_mime_types` do bucket. */
const ACEITOS = ".pdf,.doc,.docx,.ppt,.pptx";

function IconePorNome({ nome }: { nome: string }) {
  const ext = extensaoDe(nome);
  if (ext === "PDF") return <IconFileTypePdf size={18} />;
  if (ext === "DOC" || ext === "DOCX") return <IconFileTypeDocx size={18} />;
  return <IconPaperclip size={18} />;
}

/**
 * Baixar passa por URL assinada de 60s, criada no clique.
 *
 * Nada de `window.open` depois do await: o bloqueador de pop-up mata a janela
 * que não nasceu de um clique direto. Navegar a própria aba para uma URL com
 * `content-disposition: attachment` baixa o arquivo sem sair da página.
 */
function BotaoBaixar({ material }: { material: MaterialVenda }) {
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      window.location.href = await urlAssinadaMaterial(material);
    } catch (err) {
      notifications.show({
        color: "red",
        message: getErrorMessage(err, "Não foi possível baixar o arquivo."),
      });
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Tooltip label="Baixar">
      <ActionIcon variant="subtle" loading={baixando} onClick={baixar} aria-label="Baixar arquivo">
        <IconDownload size={16} />
      </ActionIcon>
    </Tooltip>
  );
}

function LinhaMaterial({
  material,
  aoExcluir,
  excluindo,
}: {
  material: MaterialVenda;
  aoExcluir?: () => void;
  excluindo?: boolean;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
        <IconePorNome nome={material.nome} />
        <div style={{ minWidth: 0 }}>
          <Text size="sm" truncate>
            {material.nome}
          </Text>
          <Text size="xs" c="dimmed">
            {formatarTamanho(material.tamanhoBytes)}
          </Text>
        </div>
      </Group>
      <Group gap={2} wrap="nowrap">
        <BotaoBaixar material={material} />
        {aoExcluir && (
          <Tooltip label="Excluir arquivo">
            <ActionIcon
              variant="subtle"
              color="red"
              loading={excluindo}
              onClick={aoExcluir}
              aria-label="Excluir arquivo"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Group>
  );
}

/**
 * Lista somente leitura, para o Manual do Vendedor. Quem vende baixa; quem
 * mantém o catálogo é que sobe e apaga, na tela de Administração.
 */
export function MateriaisLista({ materiais }: { materiais: MaterialVenda[] }) {
  if (materiais.length === 0) return null;

  return (
    <Stack gap={6}>
      {materiais.map((material) => (
        <LinhaMaterial key={material.id} material={material} />
      ))}
    </Stack>
  );
}

/**
 * Bloco de gestão dos arquivos de um tipo, para a aba Catálogo.
 *
 * Não tem confirmação de exclusão de propósito: o arquivo foi subido e pode ser
 * subido de novo, ao contrário de um serviço registrado, que lastreia
 * certificado emitido. Pedir confirmação para tudo é o que ensina a clicar em
 * "confirmar" sem ler.
 */
export function MateriaisEditor({
  tipoServicoId,
  materiais,
}: {
  tipoServicoId: string;
  materiais: MaterialVenda[];
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const upload = useUploadMaterialVenda();
  const remove = useDeleteMaterialVenda();

  return (
    <Stack gap="xs">
      <Group gap={6}>
        <Text size="sm" fw={500}>
          Arquivos
        </Text>
        <Badge variant="light" size="sm">
          {materiais.length}
        </Badge>
      </Group>

      {materiais.length === 0 ? (
        <Text size="xs" c="dimmed">
          Nenhum arquivo anexado. O vendedor vê estes arquivos no Manual do Vendedor.
        </Text>
      ) : (
        <Stack gap={6}>
          {materiais.map((material) => (
            <LinhaMaterial
              key={material.id}
              material={material}
              excluindo={remove.isPending && remove.variables?.id === material.id}
              aoExcluir={() => remove.mutate(material)}
            />
          ))}
        </Stack>
      )}

      <Group align="flex-end" gap="xs">
        <FileInput
          flex={1}
          size="sm"
          accept={ACEITOS}
          placeholder="PDF, DOC, DOCX, PPT ou PPTX (até 20 MB)"
          leftSection={<IconPaperclip size={16} />}
          clearable
          value={arquivo}
          onChange={setArquivo}
        />
        <Button
          size="sm"
          leftSection={<IconUpload size={16} />}
          disabled={!arquivo}
          loading={upload.isPending}
          onClick={() =>
            arquivo &&
            upload.mutate({ tipoServicoId, arquivo }, { onSuccess: () => setArquivo(null) })
          }
        >
          Anexar
        </Button>
      </Group>
    </Stack>
  );
}

/** Aviso do modal de criação, onde ainda não existe id para pendurar o arquivo.
 * Dizer isso é melhor do que mostrar um campo que falharia no envio. */
export function MateriaisIndisponivel() {
  return (
    <Text size="xs" c="dimmed">
      Arquivos de apoio podem ser anexados depois de criar o tipo — reabra este item no catálogo.
    </Text>
  );
}
