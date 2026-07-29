"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  FileInput,
  Group,
  Modal,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconFileUpload, IconUpload } from "@tabler/icons-react";
import { useLeads } from "@/hooks/useLeads";
import { useClientes } from "@/hooks/useClientes";
import { useTiposServico } from "@/hooks/useServicos";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { createLead } from "@/lib/supabase/queries/leads";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/errors";
import { formatarCnpj } from "@/lib/cnpj";
import { exibirCodigo } from "@/lib/cnae";
import {
  avaliarImportacao,
  DESCARTE_LABELS,
  importaveis,
  paraLeadInput,
  resumir,
  type ArquivoProspeccao,
  type Candidato,
} from "@/lib/importacao";
import { StatCard } from "@/components/shared/StatCard";

/**
 * Importação da lista de prospecção gerada por scripts/importar-receita.mjs.
 *
 * A revisão antes de gravar não é cerimônia: um arquivo da região de Sorocaba
 * traz milhares de empresas, e despejar isso no funil de uma vez transforma o
 * kanban em lixo. A tela força escolher o lote.
 */
export function ImportarLeads({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { data: leads } = useLeads();
  const { data: clientes } = useClientes();
  const { data: tipos } = useTiposServico();
  const { data: member } = useCurrentMember();
  const queryClient = useQueryClient();

  const [arquivo, setArquivo] = useState<ArquivoProspeccao | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [gravando, setGravando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const candidatos = useMemo(() => {
    if (!arquivo) return [];
    return avaliarImportacao(arquivo, {
      leads: leads ?? [],
      clientes: clientes ?? [],
      tipos: tipos ?? [],
    });
  }, [arquivo, leads, clientes, tipos]);

  const podem = useMemo(() => importaveis(candidatos), [candidatos]);
  const resumo = useMemo(() => resumir(candidatos), [candidatos]);

  async function lerArquivo(file: File | null) {
    setArquivo(null);
    setErroArquivo(null);
    setMarcados(new Set());
    if (!file) return;

    try {
      const dados = JSON.parse(await file.text()) as ArquivoProspeccao;
      if (!Array.isArray(dados.registros)) {
        throw new Error("O arquivo não tem a lista `registros`.");
      }
      setArquivo(dados);
      // Nada vem marcado: escolher o lote é a decisão que esta tela existe para
      // provocar. Pré-marcar tudo devolveria o problema do despejo cego.
      setMarcados(new Set());
    } catch (err) {
      setErroArquivo(
        getErrorMessage(err, "Não foi possível ler o arquivo. Ele veio do script de importação?"),
      );
    }
  }

  function alternar(cnpj: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(cnpj)) novo.delete(cnpj);
      else novo.add(cnpj);
      return novo;
    });
  }

  async function importar() {
    const escolhidos = podem.filter((c) => marcados.has(c.registro.cnpj));
    if (escolhidos.length === 0) return;

    setGravando(true);
    setProgresso(0);
    let gravados = 0;
    const falhas: string[] = [];

    // Um a um, e não em lote: o insert em lote do PostgREST falha inteiro se uma
    // linha esbarrar numa constraint, e aí ninguém sabe qual das 200 foi.
    for (const [indice, candidato] of escolhidos.entries()) {
      try {
        await createLead(paraLeadInput(candidato, member?.id ?? null));
        gravados++;
      } catch (err) {
        falhas.push(`${candidato.registro.razaoSocial}: ${getErrorMessage(err, "erro")}`);
      }
      setProgresso(Math.round(((indice + 1) / escolhidos.length) * 100));
    }

    await queryClient.invalidateQueries({ queryKey: ["leads"] });
    setGravando(false);

    notifications.show({
      color: falhas.length === 0 ? "green" : "orange",
      title: `${gravados} ${gravados === 1 ? "lead importado" : "leads importados"}`,
      message:
        falhas.length === 0
          ? "Já estão no funil, em Novo Lead."
          : `${falhas.length} falharam. Primeira: ${falhas[0]}`,
      autoClose: falhas.length === 0 ? 5000 : false,
    });

    if (falhas.length === 0) {
      setArquivo(null);
      setMarcados(new Set());
      onClose();
    }
  }

  const todosMarcados = podem.length > 0 && marcados.size === podem.length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={3}>Importar prospecção</Title>}
      size="xl"
    >
      <Stack>
        {!arquivo && (
          <>
            <Text size="sm" c="dimmed">
              Escolha o arquivo gerado por <code>scripts/importar-receita.mjs</code>. Ele sai dos
              dados abertos da Receita Federal, já filtrado pela sua região e pelos CNAEs do seu
              catálogo.
            </Text>
            <FileInput
              label="Arquivo de prospecção"
              placeholder="prospeccao.json"
              accept="application/json,.json"
              leftSection={<IconFileUpload size={16} />}
              onChange={lerArquivo}
            />
            {erroArquivo && (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                {erroArquivo}
              </Alert>
            )}
          </>
        )}

        {arquivo && (
          <>
            <SimpleGrid cols={{ base: 2, sm: 4 }}>
              <StatCard label="No arquivo" value={resumo.total} />
              <StatCard label="Podem entrar" value={resumo.importaveis} color="green" />
              <StatCard
                label="Já no CRM"
                value={resumo.porMotivo.ja_e_lead + resumo.porMotivo.ja_e_cliente}
                color="gray"
              />
              <StatCard
                label="Com serviço sugerido"
                value={resumo.comSugestao}
                color="blue"
                hint="pelo CNAE"
              />
            </SimpleGrid>

            {resumo.comSugestao === 0 && resumo.importaveis > 0 && (
              <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
                Nenhuma empresa veio com serviço sugerido. Provavelmente os tipos do catálogo ainda
                não têm CNAE configurado — sem isso a importação entrega nomes, mas não entrega o
                que vender. Vale configurar em Administração → Catálogo antes de importar.
              </Alert>
            )}

            <Group justify="space-between">
              <Checkbox
                label={`Marcar todos os ${podem.length} que podem entrar`}
                checked={todosMarcados}
                indeterminate={marcados.size > 0 && !todosMarcados}
                onChange={() =>
                  setMarcados(todosMarcados ? new Set() : new Set(podem.map((c) => c.registro.cnpj)))
                }
              />
              <Text size="sm" c="dimmed">
                {marcados.size} selecionados
              </Text>
            </Group>

            <ScrollArea.Autosize mah={360}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40} />
                    <Table.Th>Empresa</Table.Th>
                    <Table.Th>Cidade</Table.Th>
                    <Table.Th>Segmento</Table.Th>
                    <Table.Th>Sugestão</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {candidatos.map((c) => (
                    <Linha
                      key={c.registro.cnpj}
                      candidato={c}
                      marcado={marcados.has(c.registro.cnpj)}
                      onToggle={() => alternar(c.registro.cnpj)}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>

            {gravando && <Progress value={progresso} striped animated />}

            <Group justify="space-between">
              <Button variant="subtle" color="gray" onClick={() => setArquivo(null)}>
                Trocar arquivo
              </Button>
              <Button
                leftSection={<IconUpload size={16} />}
                disabled={marcados.size === 0}
                loading={gravando}
                onClick={importar}
              >
                Importar {marcados.size > 0 ? marcados.size : ""}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}

function Linha({
  candidato,
  marcado,
  onToggle,
}: {
  candidato: Candidato;
  marcado: boolean;
  onToggle: () => void;
}) {
  const { registro, descarte, servicosSugeridos, segmento } = candidato;
  const bloqueado = descarte !== null;

  return (
    <Table.Tr style={{ opacity: bloqueado ? 0.5 : 1 }}>
      <Table.Td>
        <Checkbox checked={marcado} disabled={bloqueado} onChange={onToggle} />
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw={500} lineClamp={1}>
          {registro.nomeFantasia?.trim() || registro.razaoSocial}
        </Text>
        <Text size="xs" c="dimmed">
          {formatarCnpj(registro.cnpj)}
          {registro.porte && ` · ${registro.porte}`}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{registro.cidade}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" lineClamp={1}>
          {segmento ?? "—"}
        </Text>
        <Text size="xs" c="dimmed">
          {exibirCodigo(registro.cnae)}
        </Text>
      </Table.Td>
      <Table.Td>
        {bloqueado ? (
          <Badge color="gray" variant="light" size="sm" title={DESCARTE_LABELS[descarte].ajuda}>
            {DESCARTE_LABELS[descarte].label}
          </Badge>
        ) : servicosSugeridos.length > 0 ? (
          <Group gap={4}>
            {servicosSugeridos.slice(0, 3).map((s) => (
              <Badge key={s} color="blue" variant="light" size="sm">
                {s}
              </Badge>
            ))}
            {servicosSugeridos.length > 3 && (
              <Text size="xs" c="dimmed">
                +{servicosSugeridos.length - 3}
              </Text>
            )}
          </Group>
        ) : (
          <Text size="xs" c="dimmed">
            —
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  );
}
