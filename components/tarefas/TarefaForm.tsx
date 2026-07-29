"use client";

import { Button, Group, Select, Stack, Textarea, TextInput } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { opcoesDeMembro } from "@/lib/equipe";
import { exigirTexto } from "@/lib/validacao";
import { PRIORIDADE_LABELS, type Tarefa, type TarefaInput, type TarefaPrioridade } from "@/types/tarefa";
import type { TeamMember } from "@/types/team";

interface Props {
  tarefa?: Tarefa;
  /** Pré-preenchimento quando a tarefa nasce de "Delegar". */
  draft?: Partial<TarefaInput>;
  membros: TeamMember[];
  onSubmit: (input: Partial<TarefaInput> & { titulo: string }) => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function TarefaForm({
  tarefa,
  draft,
  membros,
  onSubmit,
  submitting,
  submitLabel = "Salvar",
}: Props) {
  const base = tarefa ?? draft;

  const form = useForm({
    initialValues: {
      titulo: base?.titulo ?? "",
      descricao: base?.descricao ?? "",
      prioridade: base?.prioridade ?? ("normal" as TarefaPrioridade),
      // Coluna `date`: o DateInput do Mantine v9 já trabalha com "YYYY-MM-DD",
      // então a string vai direto para o PostgREST sem passar por new Date.
      prazo: base?.prazo ?? null,
      responsavelId: base?.responsavelId ?? null,
    },
    validate: {
      titulo: (value) => exigirTexto(value, "Descreva a tarefa em poucas palavras.", 3),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        onSubmit({
          titulo: values.titulo.trim(),
          descricao: values.descricao.trim() === "" ? null : values.descricao.trim(),
          prioridade: values.prioridade,
          prazo: values.prazo,
          responsavelId: values.responsavelId,
          // Só na criação a partir de uma pendência; na edição vem de `tarefa` e
          // não muda.
          ...(draft?.origemPendencia ? { origemPendencia: draft.origemPendencia } : {}),
          ...(draft?.clienteId ? { clienteId: draft.clienteId } : {}),
          ...(draft?.leadId ? { leadId: draft.leadId } : {}),
          ...(draft?.servicoId ? { servicoId: draft.servicoId } : {}),
        }),
      )}
    >
      <Stack>
        <TextInput
          label="Tarefa"
          placeholder="Achar instrutor de NR-35 para a Ki Jóia"
          withAsterisk
          {...form.getInputProps("titulo")}
        />

        <Textarea
          label="Detalhes"
          placeholder="Opcional — contexto, contatos, o que já foi tentado"
          minRows={2}
          {...form.getInputProps("descricao")}
        />

        <Group grow>
          <Select
            label="Responsável"
            placeholder="Administração"
            description="Em branco = fica para os administradores"
            clearable
            searchable
            data={opcoesDeMembro(membros, form.values.responsavelId)}
            {...form.getInputProps("responsavelId")}
          />
          <Select
            label="Prioridade"
            data={Object.entries(PRIORIDADE_LABELS).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
            allowDeselect={false}
            {...form.getInputProps("prioridade")}
          />
        </Group>

        <DateInput
          label="Prazo"
          placeholder="Opcional"
          valueFormat="DD/MM/YYYY"
          clearable
          {...form.getInputProps("prazo")}
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
