"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconNote,
  IconPencil,
  IconTool,
  IconUser,
} from "@tabler/icons-react";
import { useClientes, useToggleClienteAtivo, useUpdateCliente } from "@/hooks/useClientes";
import { useServicos, useTiposServico } from "@/hooks/useServicos";
import { useTeamMembers } from "@/hooks/useCurrentMember";
import { useActivities } from "@/hooks/useActivities";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { ServicosPanel } from "@/components/servicos/ServicosPanel";
import { CopyableField } from "@/components/shared/CopyableField";
import { NoteComposer } from "@/components/leads/NoteComposer";
import { ActivityTimeline } from "@/components/leads/ActivityTimeline";
import { WhatsAppButton } from "@/components/leads/WhatsAppButton";
import { ExclusaoControl } from "@/components/shared/ExclusaoControl";
import { SITUACAO_LABELS, itensVenciveis, situacaoCliente } from "@/lib/vencimentos";
import { nomeCliente } from "@/types/cliente";

/**
 * O que a exclusão leva junto, em número. Serviços e notas têm FK em cascata a
 * partir de `clientes` — dizer "isto apaga 12 serviços" é a diferença entre uma
 * confirmação informada e um clique no escuro.
 */
function descreverCascata(servicos: number, notas: number): string | undefined {
  const partes: string[] = [];
  if (servicos > 0) partes.push(`${servicos} ${servicos === 1 ? "serviço" : "serviços"}`);
  if (notas > 0) partes.push(`${notas} ${notas === 1 ? "nota" : "notas"}`);
  if (partes.length === 0) return undefined;
  return `Isto apaga também ${partes.join(" e ")} — é o histórico que comprova conformidade.`;
}

export default function ClienteDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clienteId = params.id;

  const { data: clientes, isLoading } = useClientes();
  const { data: servicos } = useServicos();
  const { data: tipos } = useTiposServico();
  const { data: membros } = useTeamMembers();
  const { data: activities, isLoading: loadingActivities } = useActivities({ clienteId });

  const [editando, setEditando] = useState(false);
  const updateCliente = useUpdateCliente();
  const toggleAtivo = useToggleClienteAtivo();

  const cliente = clientes?.find((c) => c.id === clienteId);
  const doCliente = useMemo(
    () => (servicos ?? []).filter((s) => s.clienteId === clienteId),
    [servicos, clienteId],
  );

  const situacao = useMemo(() => {
    if (!cliente) return null;
    return situacaoCliente(clienteId, itensVenciveis(doCliente, [cliente]));
  }, [cliente, doCliente, clienteId]);

  if (isLoading) return <Loader />;
  if (!cliente) {
    return (
      <Stack>
        <Alert color="red" title="Cliente não encontrado">
          Este cliente não existe ou foi removido.
        </Alert>
        <Anchor onClick={() => router.push("/clientes")}>Voltar para a lista</Anchor>
      </Stack>
    );
  }

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={14} />}
            onClick={() => router.push("/clientes")}
            style={{ alignSelf: "flex-start" }}
          >
            Clientes
          </Button>
          <Group gap="sm">
            <Title order={2}>{nomeCliente(cliente)}</Title>
            {situacao && (
              <Badge color={SITUACAO_LABELS[situacao].color} variant="light" size="lg">
                {SITUACAO_LABELS[situacao].label}
              </Badge>
            )}
            {cliente.status === "inativo" && (
              <Badge color="gray" variant="outline" size="lg">
                Inativo
              </Badge>
            )}
          </Group>
        </Stack>
        <Group>
          <WhatsAppButton phoneE164={cliente.telefoneE164} />
          <Button
            variant="outline"
            color="gray"
            leftSection={<IconPencil size={16} />}
            onClick={() => setEditando(true)}
          >
            Editar
          </Button>
        </Group>
      </Group>

      <Tabs defaultValue="dados">
        <Tabs.List>
          <Tabs.Tab value="dados" leftSection={<IconUser size={14} />}>
            Dados
          </Tabs.Tab>
          <Tabs.Tab value="servicos" leftSection={<IconTool size={14} />}>
            Serviços ({doCliente.length})
          </Tabs.Tab>
          <Tabs.Tab value="notas" leftSection={<IconNote size={14} />}>
            Notas
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dados" pt="md">
          <Stack>
            <Paper withBorder p="md" radius="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                <CopyableField label="Razão social" value={cliente.razaoSocial} />
                <CopyableField label="Nome fantasia" value={cliente.nomeFantasia} />
                <CopyableField label="CNPJ" value={cliente.cnpj} />
                <CopyableField label="Contato" value={cliente.contatoNome} />
                <CopyableField label="Cargo" value={cliente.contatoCargo} />
                <CopyableField label="Telefone" value={cliente.telefone} />
                <CopyableField label="E-mail" value={cliente.email} />
                <CopyableField label="Endereço" value={cliente.endereco} />
                <CopyableField
                  label="Cidade"
                  value={[cliente.cidade, cliente.uf].filter(Boolean).join(" - ") || null}
                />
                <CopyableField label="CEP" value={cliente.cep} />
              </SimpleGrid>
            </Paper>

            {cliente.possiveisServicos && cliente.possiveisServicos.length > 0 && (
              <Paper withBorder p="md" radius="md">
                <Text size="xs" c="dimmed" mb={8}>
                  Possíveis serviços a oferecer
                </Text>
                <Group gap="xs">
                  {cliente.possiveisServicos.map((s) => (
                    <Badge key={s} variant="light" color="blue">
                      {s}
                    </Badge>
                  ))}
                </Group>
              </Paper>
            )}

            {cliente.observacoes && (
              <Paper withBorder p="md" radius="md">
                <Text size="xs" c="dimmed" mb={4}>
                  Observações
                </Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {cliente.observacoes}
                </Text>
              </Paper>
            )}

            <Group>
              <Button
                variant="light"
                color={cliente.status === "ativo" ? "gray" : "green"}
                loading={toggleAtivo.isPending}
                onClick={() =>
                  toggleAtivo.mutate({ id: cliente.id, ativo: cliente.status !== "ativo" })
                }
              >
                {cliente.status === "ativo" ? "Inativar cliente" : "Reativar cliente"}
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              Inativar preserva o histórico de serviços, que é o que comprova conformidade — é o
              caminho certo para um cliente que saiu.
            </Text>

            <Divider my="xs" />

            <ExclusaoControl
              entidade="cliente"
              registroId={cliente.id}
              rotulo={nomeCliente(cliente)}
              cascata={descreverCascata(doCliente.length, activities?.length ?? 0)}
              onExcluido={() => router.push("/clientes")}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="servicos" pt="md">
          <ServicosPanel
            servicos={doCliente}
            clientes={[]}
            membros={membros ?? []}
            tipos={tipos ?? []}
            clienteFixo={clienteId}
          />
        </Tabs.Panel>

        <Tabs.Panel value="notas" pt="md">
          <Stack>
            <NoteComposer
              owner={{ clienteId }}
              placeholder="Adicionar uma nota sobre este cliente"
            />
            <ActivityTimeline activities={activities} loading={loadingActivities} />
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={editando}
        onClose={() => setEditando(false)}
        title={<Title order={3}>Editar cliente</Title>}
        size="lg"
      >
        <ClienteForm
          cliente={cliente}
          tipos={tipos ?? []}
          membros={membros ?? []}
          submitting={updateCliente.isPending}
          submitLabel="Salvar alterações"
          onSubmit={(patch) =>
            updateCliente.mutate({ id: cliente.id, patch }, { onSuccess: () => setEditando(false) })
          }
        />
      </Modal>
    </Stack>
  );
}
