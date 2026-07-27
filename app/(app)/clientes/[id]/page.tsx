"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Anchor,
  Badge,
  Button,
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
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconCertificate,
  IconNote,
  IconPencil,
  IconPlus,
  IconTool,
  IconUser,
} from "@tabler/icons-react";
import { useClientes, useToggleClienteAtivo, useUpdateCliente } from "@/hooks/useClientes";
import {
  useCreateTreinamento,
  useDeleteTreinamento,
  useTiposTreinamento,
  useTreinamentos,
  useUpdateTreinamento,
} from "@/hooks/useTreinamentos";
import {
  useCreateServico,
  useDeleteServico,
  useServicos,
  useUpdateServico,
} from "@/hooks/useServicos";
import { useTeamMembers } from "@/hooks/useCurrentMember";
import { useActivities } from "@/hooks/useActivities";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { TreinamentosTable } from "@/components/treinamentos/TreinamentosTable";
import { TreinamentoForm } from "@/components/treinamentos/TreinamentoForm";
import { ServicosTable } from "@/components/servicos/ServicosTable";
import { ServicoForm } from "@/components/servicos/ServicoForm";
import { CopyableField } from "@/components/shared/CopyableField";
import { AdminDeleteButton } from "@/components/shared/AdminDeleteButton";
import { NoteComposer } from "@/components/leads/NoteComposer";
import { ActivityTimeline } from "@/components/leads/ActivityTimeline";
import { WhatsAppButton } from "@/components/leads/WhatsAppButton";
import { SITUACAO_LABELS, itensVenciveis, situacaoCliente } from "@/lib/vencimentos";
import { nomeCliente } from "@/types/cliente";
import type { Servico } from "@/types/servico";
import type { Treinamento } from "@/types/treinamento";

export default function ClienteDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clienteId = params.id;

  const { data: clientes, isLoading } = useClientes();
  const { data: treinamentos } = useTreinamentos();
  const { data: servicos } = useServicos();
  const { data: tipos } = useTiposTreinamento();
  const { data: membros } = useTeamMembers();
  const { data: activities, isLoading: loadingActivities } = useActivities({ clienteId });

  const [editando, setEditando] = useState(false);
  const updateCliente = useUpdateCliente();
  const toggleAtivo = useToggleClienteAtivo();

  const cliente = clientes?.find((c) => c.id === clienteId);

  const doCliente = useMemo(
    () => ({
      treinamentos: (treinamentos ?? []).filter((t) => t.clienteId === clienteId),
      servicos: (servicos ?? []).filter((s) => s.clienteId === clienteId),
    }),
    [treinamentos, servicos, clienteId],
  );

  const situacao = useMemo(() => {
    if (!cliente) return null;
    const itens = itensVenciveis(doCliente.treinamentos, doCliente.servicos, [cliente]);
    return situacaoCliente(clienteId, itens);
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
          <Tabs.Tab value="treinamentos" leftSection={<IconCertificate size={14} />}>
            Treinamentos ({doCliente.treinamentos.length})
          </Tabs.Tab>
          <Tabs.Tab value="servicos" leftSection={<IconTool size={14} />}>
            Serviços ({doCliente.servicos.length})
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
              Clientes não são excluídos: inativar preserva todo o histórico de treinamentos e
              serviços, que é o que comprova conformidade.
            </Text>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="treinamentos" pt="md">
          <TreinamentosTab clienteId={clienteId} treinamentos={doCliente.treinamentos} tipos={tipos ?? []} />
        </Tabs.Panel>

        <Tabs.Panel value="servicos" pt="md">
          <ServicosTab
            clienteId={clienteId}
            servicos={doCliente.servicos}
            servicosTodos={servicos ?? []}
            membros={membros ?? []}
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
          submitting={updateCliente.isPending}
          submitLabel="Salvar alterações"
          onSubmit={(patch) =>
            updateCliente.mutate(
              { id: cliente.id, patch },
              { onSuccess: () => setEditando(false) },
            )
          }
        />
      </Modal>
    </Stack>
  );
}

function TreinamentosTab({
  clienteId,
  treinamentos,
  tipos,
}: {
  clienteId: string;
  treinamentos: Treinamento[];
  tipos: Parameters<typeof TreinamentoForm>[0]["tipos"];
}) {
  const [novoOpened, { open: abrirNovo, close: fecharNovo }] = useDisclosure(false);
  const [emEdicao, setEmEdicao] = useState<Treinamento | null>(null);
  const create = useCreateTreinamento();
  const update = useUpdateTreinamento();
  const remove = useDeleteTreinamento();

  return (
    <Stack>
      <Group justify="flex-end">
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNovo}>
          Novo treinamento
        </Button>
      </Group>

      <TreinamentosTable
        treinamentos={treinamentos}
        clientes={[]}
        hideCliente
        onRowClick={setEmEdicao}
      />

      <Modal
        opened={novoOpened}
        onClose={fecharNovo}
        title={<Title order={3}>Novo treinamento</Title>}
        size="lg"
      >
        <TreinamentoForm
          clientes={[]}
          tipos={tipos}
          clienteFixo={clienteId}
          submitting={create.isPending}
          submitLabel="Registrar"
          onSubmit={(input) => create.mutate(input, { onSuccess: fecharNovo })}
        />
      </Modal>

      <Modal
        opened={emEdicao !== null}
        onClose={() => setEmEdicao(null)}
        title={<Title order={3}>Editar treinamento</Title>}
        size="lg"
      >
        {emEdicao && (
          <>
            <TreinamentoForm
              key={emEdicao.id}
              treinamento={emEdicao}
              clientes={[]}
              tipos={tipos}
              clienteFixo={clienteId}
              submitting={update.isPending}
              submitLabel="Salvar alterações"
              onSubmit={(patch) =>
                update.mutate({ id: emEdicao.id, patch }, { onSuccess: () => setEmEdicao(null) })
              }
            />
            <Group mt="md">
              <AdminDeleteButton
                loading={remove.isPending}
                label="Excluir treinamento"
                confirmText="O registro sai do histórico e do controle de vencimentos. Não pode ser desfeito."
                onConfirm={() => remove.mutate(emEdicao.id, { onSuccess: () => setEmEdicao(null) })}
              />
            </Group>
          </>
        )}
      </Modal>
    </Stack>
  );
}

function ServicosTab({
  clienteId,
  servicos,
  servicosTodos,
  membros,
}: {
  clienteId: string;
  servicos: Servico[];
  servicosTodos: Servico[];
  membros: Parameters<typeof ServicoForm>[0]["membros"];
}) {
  const [novoOpened, { open: abrirNovo, close: fecharNovo }] = useDisclosure(false);
  const [emEdicao, setEmEdicao] = useState<Servico | null>(null);
  const create = useCreateServico();
  const update = useUpdateServico();
  const remove = useDeleteServico();

  // Tipos já usados em qualquer cliente alimentam o Autocomplete.
  const tiposConhecidos = useMemo(
    () => Array.from(new Set(servicosTodos.map((s) => s.tipo))).sort(),
    [servicosTodos],
  );

  return (
    <Stack>
      <Group justify="flex-end">
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNovo}>
          Novo serviço
        </Button>
      </Group>

      <ServicosTable
        servicos={servicos}
        clientes={[]}
        membros={membros}
        hideCliente
        onRowClick={setEmEdicao}
      />

      <Modal opened={novoOpened} onClose={fecharNovo} title={<Title order={3}>Novo serviço</Title>} size="lg">
        <ServicoForm
          clientes={[]}
          membros={membros}
          tiposConhecidos={tiposConhecidos}
          clienteFixo={clienteId}
          submitting={create.isPending}
          submitLabel="Registrar"
          onSubmit={(input) => create.mutate(input, { onSuccess: fecharNovo })}
        />
      </Modal>

      <Modal
        opened={emEdicao !== null}
        onClose={() => setEmEdicao(null)}
        title={<Title order={3}>Editar serviço</Title>}
        size="lg"
      >
        {emEdicao && (
          <>
            <ServicoForm
              key={emEdicao.id}
              servico={emEdicao}
              clientes={[]}
              membros={membros}
              tiposConhecidos={tiposConhecidos}
              clienteFixo={clienteId}
              submitting={update.isPending}
              submitLabel="Salvar alterações"
              onSubmit={(patch) =>
                update.mutate({ id: emEdicao.id, patch }, { onSuccess: () => setEmEdicao(null) })
              }
            />
            <Group mt="md">
              <AdminDeleteButton
                loading={remove.isPending}
                label="Excluir serviço"
                confirmText="O registro sai do histórico do cliente. Não pode ser desfeito."
                onConfirm={() => remove.mutate(emEdicao.id, { onSuccess: () => setEmEdicao(null) })}
              />
            </Group>
          </>
        )}
      </Modal>
    </Stack>
  );
}
