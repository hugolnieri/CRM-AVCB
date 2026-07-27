"use client";

import { Autocomplete, Button, Group, Select, SimpleGrid, Stack, Textarea } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { nomeCliente, type Cliente } from "@/types/cliente";
import type { Servico, ServicoInput } from "@/types/servico";
import type { TeamMember } from "@/types/team";

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

interface Props {
  servico?: Servico;
  clientes: Cliente[];
  membros: TeamMember[];
  /** Tipos já cadastrados, para o Autocomplete. Texto livre continua permitido. */
  tiposConhecidos: string[];
  clienteFixo?: string;
  onSubmit: (input: ServicoInput) => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function ServicoForm({
  servico,
  clientes,
  membros,
  tiposConhecidos,
  clienteFixo,
  onSubmit,
  submitting,
  submitLabel = "Salvar",
}: Props) {
  const form = useForm({
    initialValues: {
      clienteId: servico?.clienteId ?? clienteFixo ?? null,
      tipo: servico?.tipo ?? "",
      // Strings "YYYY-MM-DD" — colunas `date`. Ver o comentário em TreinamentoForm.
      data: servico?.data ?? null,
      dataProxima: servico?.dataProxima ?? null,
      responsavelId: servico?.responsavelId ?? null,
      observacoes: servico?.observacoes ?? "",
    },
    validate: {
      clienteId: (value) => (value ? null : "Escolha o cliente."),
      tipo: (value) => (value.trim().length < 2 ? "Informe o tipo do serviço." : null),
      data: (value) => (value ? null : "Informe a data do serviço."),
      dataProxima: (value, values) =>
        value && values.data && value < values.data
          ? "A próxima data não pode ser anterior à data do serviço."
          : null,
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        onSubmit({
          clienteId: values.clienteId as string,
          tipo: values.tipo.trim(),
          data: values.data as string,
          dataProxima: values.dataProxima,
          responsavelId: values.responsavelId,
          observacoes: nullIfBlank(values.observacoes),
        }),
      )}
    >
      <Stack>
        {!clienteFixo && (
          <Select
            label="Cliente"
            placeholder="Escolha a empresa"
            withAsterisk
            searchable
            data={clientes.map((c) => ({ value: c.id, label: nomeCliente(c) }))}
            {...form.getInputProps("clienteId")}
          />
        )}

        {/* Autocomplete e não Select: o tipo é texto livre por requisito, mas
            sugerir o que já existe faz o vocabulário convergir sozinho. */}
        <Autocomplete
          label="Tipo do serviço"
          placeholder="Ex.: Laudo de insalubridade, manutenção de extintores..."
          withAsterisk
          data={tiposConhecidos}
          {...form.getInputProps("tipo")}
        />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <DateInput
            label="Data do serviço"
            placeholder="DD/MM/AAAA"
            valueFormat="DD/MM/YYYY"
            withAsterisk
            {...form.getInputProps("data")}
          />
          <DateInput
            label="Próxima (opcional)"
            placeholder="Manutenção / reavaliação"
            valueFormat="DD/MM/YYYY"
            clearable
            description="Preenchido, entra no controle de vencimentos"
            {...form.getInputProps("dataProxima")}
          />
        </SimpleGrid>

        <Select
          label="Responsável"
          placeholder="Quem executou"
          clearable
          searchable
          data={membros.map((m) => ({ value: m.id, label: m.fullName }))}
          {...form.getInputProps("responsavelId")}
        />

        <Textarea label="Observações" minRows={3} {...form.getInputProps("observacoes")} />

        <Group justify="flex-end">
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
