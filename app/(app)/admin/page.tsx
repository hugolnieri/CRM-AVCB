"use client";

import { useState } from "react";
import {
  Button,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { IconCertificate, IconPlus, IconUsers } from "@tabler/icons-react";
import { useCurrentMember, useTeamMembers } from "@/hooks/useCurrentMember";
import {
  useCreateTipoTreinamento,
  useTiposTreinamento,
  useUpdateTipoTreinamento,
} from "@/hooks/useTreinamentos";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import { RequireAdmin } from "@/components/shared/RequireAdmin";
import { setMemberRole } from "@/lib/supabase/queries/team";
import type { TipoTreinamento } from "@/types/treinamento";
import type { UserRole } from "@/types/team";

export default function AdminPage() {
  return (
    <RequireAdmin>
      <Stack>
        <Title order={2}>Administração</Title>

        <Tabs defaultValue="equipe">
          <Tabs.List>
            <Tabs.Tab value="equipe" leftSection={<IconUsers size={14} />}>
              Equipe
            </Tabs.Tab>
            <Tabs.Tab value="tipos" leftSection={<IconCertificate size={14} />}>
              Tipos de treinamento
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="equipe" pt="md">
            <EquipeTab />
          </Tabs.Panel>

          <Tabs.Panel value="tipos" pt="md">
            <TiposTab />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </RequireAdmin>
  );
}

function EquipeTab() {
  const { data: membros, isLoading } = useTeamMembers();
  const { data: eu } = useCurrentMember();

  const alterarPerfil = useCrudMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => setMemberRole(id, role),
    invalidate: [["teamMembers"], ["currentMember"]],
    successMessage: "Perfil de acesso atualizado.",
    errorMessage: "Erro ao alterar o perfil.",
  });

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Administradores mantêm o catálogo de tipos de treinamento, alteram perfis e são os únicos
        que podem excluir registros. Colaboradores fazem todo o resto do dia a dia.
      </Text>

      <Table.ScrollContainer minWidth={600}>
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>E-mail</Table.Th>
              <Table.Th>Perfil</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(membros ?? []).map((membro) => (
              <Table.Tr key={membro.id}>
                <Table.Td>{membro.fullName}</Table.Td>
                <Table.Td>{membro.email}</Table.Td>
                <Table.Td>
                  <Select
                    data={[
                      { value: "admin", label: "Administrador" },
                      { value: "colaborador", label: "Colaborador" },
                    ]}
                    value={membro.role}
                    allowDeselect={false}
                    // O banco também recusa (set_member_role levanta exceção),
                    // mas desabilitar evita o erro previsível.
                    disabled={membro.id === eu?.id || alterarPerfil.isPending}
                    onChange={(value) =>
                      value && alterarPerfil.mutate({ id: membro.id, role: value as UserRole })
                    }
                    w={180}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Text size="xs" c="dimmed">
        Você não pode alterar o próprio perfil — é o que impede o último administrador de trancar a
        equipe do lado de fora.
      </Text>
    </Stack>
  );
}

function TiposTab() {
  const { data: tipos, isLoading } = useTiposTreinamento();
  const [novoOpened, { open: abrirNovo, close: fecharNovo }] = useDisclosure(false);
  const [emEdicao, setEmEdicao] = useState<TipoTreinamento | null>(null);
  const create = useCreateTipoTreinamento();
  const update = useUpdateTipoTreinamento();

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          A validade em meses é o que faz o sistema sugerir a data de vencimento ao registrar um
          treinamento. Alterar um tipo aqui não muda treinamentos já registrados.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNovo}>
          Novo tipo
        </Button>
      </Group>

      <Table.ScrollContainer minWidth={700}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Sigla</Table.Th>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Validade</Table.Th>
              <Table.Th>Carga horária</Table.Th>
              <Table.Th>Situação</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(tipos ?? []).map((tipo) => (
              <Table.Tr
                key={tipo.id}
                onClick={() => setEmEdicao(tipo)}
                style={{ cursor: "pointer" }}
              >
                <Table.Td>{tipo.sigla ?? "—"}</Table.Td>
                <Table.Td>{tipo.nome}</Table.Td>
                <Table.Td>
                  {tipo.validadeMeses ? `${tipo.validadeMeses} meses` : "Não vence"}
                </Table.Td>
                <Table.Td>{tipo.cargaHoraria ? `${tipo.cargaHoraria}h` : "—"}</Table.Td>
                <Table.Td>
                  <Text size="sm" c={tipo.ativo ? undefined : "dimmed"}>
                    {tipo.ativo ? "Ativo" : "Inativo"}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Modal opened={novoOpened} onClose={fecharNovo} title={<Title order={3}>Novo tipo</Title>}>
        <TipoForm
          submitting={create.isPending}
          submitLabel="Criar"
          onSubmit={(input) => create.mutate(input, { onSuccess: fecharNovo })}
        />
      </Modal>

      <Modal
        opened={emEdicao !== null}
        onClose={() => setEmEdicao(null)}
        title={<Title order={3}>Editar tipo</Title>}
      >
        {emEdicao && (
          <TipoForm
            key={emEdicao.id}
            tipo={emEdicao}
            submitting={update.isPending}
            submitLabel="Salvar alterações"
            onSubmit={(patch) =>
              update.mutate({ id: emEdicao.id, patch }, { onSuccess: () => setEmEdicao(null) })
            }
          />
        )}
      </Modal>
    </Stack>
  );
}

type TipoFormValues = Omit<TipoTreinamento, "id" | "createdAt">;

function TipoForm({
  tipo,
  onSubmit,
  submitting,
  submitLabel,
}: {
  tipo?: TipoTreinamento;
  onSubmit: (input: TipoFormValues) => void;
  submitting?: boolean;
  submitLabel: string;
}) {
  const form = useForm({
    initialValues: {
      nome: tipo?.nome ?? "",
      sigla: tipo?.sigla ?? "",
      validadeMeses: tipo?.validadeMeses ?? ("" as number | ""),
      cargaHoraria: tipo?.cargaHoraria ?? ("" as number | ""),
      ativo: tipo?.ativo ?? true,
      ordem: tipo?.ordem ?? 0,
    },
    validate: {
      nome: (value) => (value.trim().length < 2 ? "Informe o nome." : null),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        onSubmit({
          nome: values.nome.trim(),
          sigla: values.sigla.trim() || null,
          validadeMeses: values.validadeMeses === "" ? null : Number(values.validadeMeses),
          cargaHoraria: values.cargaHoraria === "" ? null : Number(values.cargaHoraria),
          ativo: values.ativo,
          ordem: Number(values.ordem),
        }),
      )}
    >
      <Stack>
        <TextInput label="Nome" withAsterisk {...form.getInputProps("nome")} />
        <TextInput label="Sigla" placeholder="NR-35" {...form.getInputProps("sigla")} />
        <NumberInput
          label="Validade (meses)"
          placeholder="Deixe vazio se não vence"
          min={1}
          {...form.getInputProps("validadeMeses")}
        />
        <NumberInput label="Carga horária (h)" min={0} {...form.getInputProps("cargaHoraria")} />
        <NumberInput
          label="Ordem na lista"
          min={0}
          description="Menor aparece primeiro"
          {...form.getInputProps("ordem")}
        />
        <Switch
          label="Ativo"
          description="Tipos inativos não aparecem ao registrar um treinamento novo"
          {...form.getInputProps("ativo", { type: "checkbox" })}
        />
        <Group justify="flex-end">
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
