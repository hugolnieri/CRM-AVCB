"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  NumberInput,
  Progress,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { IconPlus } from "@tabler/icons-react";
import { useMetas, useCreateMeta, useDeleteMeta, useUpdateMeta } from "@/hooks/useMetas";
import { useTeamMembers } from "@/hooks/useCurrentMember";
import { useLeads } from "@/hooks/useLeads";
import { useServicos } from "@/hooks/useServicos";
import { useActivitiesRecentes } from "@/hooks/useActivities";
import { AdminDeleteButton } from "@/components/shared/AdminDeleteButton";
import { formatarValor } from "@/components/metas/MetasProgresso";
import { corDoProgresso, metaVigente, progressoMeta } from "@/lib/metas";
import {
  METRICA_LABELS,
  PERIODO_LABELS,
  type Meta,
  type MetaInput,
  type MetaMetrica,
  type MetaPeriodo,
} from "@/types/meta";

export function MetasAdmin() {
  const { data: metas, isLoading } = useMetas();
  const { data: membros } = useTeamMembers();
  const [novoOpened, { open: abrirNovo, close: fecharNovo }] = useDisclosure(false);
  const [emEdicao, setEmEdicao] = useState<Meta | null>(null);
  const create = useCreateMeta();
  const update = useUpdateMeta();
  const remove = useDeleteMeta();

  const nomePorId = useMemo(
    () => new Map((membros ?? []).map((m) => [m.id, m.fullName])),
    [membros],
  );

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          O progresso é calculado a partir do que já é registrado no sistema — ninguém precisa
          apontar nada à mão. Metas sem colaborador valem para a equipe inteira, cada um com seu
          próprio número.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNovo}>
          Nova meta
        </Button>
      </Group>

      <Table.ScrollContainer minWidth={800}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Meta</Table.Th>
              <Table.Th>Colaborador</Table.Th>
              <Table.Th>Métrica</Table.Th>
              <Table.Th>Período</Table.Th>
              <Table.Th>Alvo</Table.Th>
              <Table.Th>Situação</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(metas ?? []).map((meta) => (
              <Table.Tr key={meta.id} onClick={() => setEmEdicao(meta)} style={{ cursor: "pointer" }}>
                <Table.Td>{meta.nome}</Table.Td>
                <Table.Td>
                  {meta.memberId ? (
                    (nomePorId.get(meta.memberId) ?? "Removido")
                  ) : (
                    <Badge variant="light" color="blue">
                      Equipe
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>{METRICA_LABELS[meta.metrica].label}</Table.Td>
                <Table.Td>{PERIODO_LABELS[meta.periodo].label}</Table.Td>
                <Table.Td>{formatarValor(meta.alvo, meta.metrica)}</Table.Td>
                <Table.Td>
                  {!meta.ativa ? (
                    <Text size="sm" c="dimmed">
                      Inativa
                    </Text>
                  ) : metaVigente(meta) ? (
                    <Badge color="green" variant="light">
                      Vigente
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="outline">
                      Fora da vigência
                    </Badge>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {(metas ?? []).length === 0 && <Text c="dimmed">Nenhuma meta cadastrada ainda.</Text>}

      <ProgressoEquipe metas={metas ?? []} />

      <Modal opened={novoOpened} onClose={fecharNovo} title={<Title order={3}>Nova meta</Title>}>
        <MetaForm
          membros={(membros ?? []).map((m) => ({ value: m.id, label: m.fullName }))}
          submitting={create.isPending}
          submitLabel="Criar"
          onSubmit={(input) => create.mutate(input, { onSuccess: fecharNovo })}
        />
      </Modal>

      <Modal
        opened={emEdicao !== null}
        onClose={() => setEmEdicao(null)}
        title={<Title order={3}>Editar meta</Title>}
      >
        {emEdicao && (
          <Stack>
            <MetaForm
              key={emEdicao.id}
              meta={emEdicao}
              membros={(membros ?? []).map((m) => ({ value: m.id, label: m.fullName }))}
              submitting={update.isPending}
              submitLabel="Salvar alterações"
              onSubmit={(patch) =>
                update.mutate({ id: emEdicao.id, patch }, { onSuccess: () => setEmEdicao(null) })
              }
            />
            <Group>
              <AdminDeleteButton
                loading={remove.isPending}
                label="Excluir meta"
                confirmText="A meta some para todos os colaboradores. O histórico de trabalho não é afetado."
                onConfirm={() => remove.mutate(emEdicao.id, { onSuccess: () => setEmEdicao(null) })}
              />
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

/** Como cada colaborador está indo nas metas vigentes. */
function ProgressoEquipe({ metas }: { metas: Meta[] }) {
  const { data: membros } = useTeamMembers();
  const { data: leads } = useLeads();
  const { data: servicos } = useServicos();
  const { data: activities } = useActivitiesRecentes(31);

  const linhas = useMemo(() => {
    const dados = {
      activities: activities ?? [],
      leads: leads ?? [],
      servicos: servicos ?? [],
    };
    return (membros ?? []).flatMap((membro) =>
      metas
        .filter((m) => metaVigente(m) && (m.memberId === null || m.memberId === membro.id))
        .map((meta) => ({ membro, progresso: progressoMeta(meta, membro.id, dados) })),
    );
  }, [membros, metas, activities, leads, servicos]);

  if (linhas.length === 0) return null;

  return (
    <Stack gap="xs" mt="md">
      <Title order={4}>Progresso da equipe</Title>
      <Table.ScrollContainer minWidth={700}>
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Colaborador</Table.Th>
              <Table.Th>Meta</Table.Th>
              <Table.Th>Período</Table.Th>
              <Table.Th w={220}>Progresso</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {linhas.map(({ membro, progresso }) => {
              const cor = corDoProgresso(progresso.percentual);
              return (
                <Table.Tr key={`${membro.id}-${progresso.meta.id}`}>
                  <Table.Td>{membro.fullName}</Table.Td>
                  <Table.Td>{progresso.meta.nome}</Table.Td>
                  <Table.Td>{PERIODO_LABELS[progresso.meta.periodo].adjetivo}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Progress value={progresso.percentual} color={cor} size="md" style={{ flex: 1 }} />
                      <Text size="xs" fw={500} c={cor} style={{ whiteSpace: "nowrap" }}>
                        {formatarValor(progresso.realizado, progresso.meta.metrica)}/
                        {formatarValor(progresso.alvo, progresso.meta.metrica)}
                      </Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}

function MetaForm({
  meta,
  membros,
  onSubmit,
  submitting,
  submitLabel,
}: {
  meta?: Meta;
  membros: { value: string; label: string }[];
  onSubmit: (input: MetaInput) => void;
  submitting?: boolean;
  submitLabel: string;
}) {
  const form = useForm({
    initialValues: {
      nome: meta?.nome ?? "",
      memberId: meta?.memberId ?? null,
      metrica: meta?.metrica ?? ("contatos_lead" as MetaMetrica),
      periodo: meta?.periodo ?? ("diaria" as MetaPeriodo),
      alvo: meta?.alvo ?? ("" as number | ""),
      ativa: meta?.ativa ?? true,
      inicioEm: meta?.inicioEm ?? null,
      fimEm: meta?.fimEm ?? null,
    },
    validate: {
      nome: (value) => (value.trim().length < 3 ? "Dê um nome à meta." : null),
      alvo: (value) => (value === "" || Number(value) <= 0 ? "Informe um alvo maior que zero." : null),
      fimEm: (value, values) =>
        value && values.inicioEm && value < values.inicioEm
          ? "O fim não pode ser antes do início."
          : null,
    },
  });

  const metricaAtual = METRICA_LABELS[form.values.metrica];

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        onSubmit({
          nome: values.nome.trim(),
          memberId: values.memberId,
          metrica: values.metrica,
          periodo: values.periodo,
          alvo: Number(values.alvo),
          ativa: values.ativa,
          inicioEm: values.inicioEm,
          fimEm: values.fimEm,
        }),
      )}
    >
      <Stack>
        <TextInput
          label="Nome da meta"
          placeholder="Contatar 40 leads por dia"
          withAsterisk
          {...form.getInputProps("nome")}
        />

        <Select
          label="Colaborador"
          placeholder="Toda a equipe"
          clearable
          searchable
          data={membros}
          description="Em branco = vale para todos, cada um com o próprio progresso"
          {...form.getInputProps("memberId")}
        />

        <Select
          label="O que medir"
          data={Object.entries(METRICA_LABELS).map(([value, meta]) => ({
            value,
            label: meta.label,
          }))}
          allowDeselect={false}
          description={metricaAtual.ajuda}
          {...form.getInputProps("metrica")}
        />

        <Group grow>
          <Select
            label="Período"
            data={Object.entries(PERIODO_LABELS).map(([value, p]) => ({ value, label: p.label }))}
            allowDeselect={false}
            {...form.getInputProps("periodo")}
          />
          <NumberInput
            label={`Alvo (${metricaAtual.unidade})`}
            min={1}
            withAsterisk
            {...form.getInputProps("alvo")}
          />
        </Group>

        <Group grow>
          <DateInput
            label="Vale a partir de"
            placeholder="Opcional"
            valueFormat="DD/MM/YYYY"
            clearable
            {...form.getInputProps("inicioEm")}
          />
          <DateInput
            label="Vale até"
            placeholder="Opcional"
            valueFormat="DD/MM/YYYY"
            clearable
            {...form.getInputProps("fimEm")}
          />
        </Group>

        <Switch
          label="Ativa"
          description="Metas inativas somem do painel dos colaboradores"
          {...form.getInputProps("ativa", { type: "checkbox" })}
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
