"use client";

import { useState } from "react";
import { Button, Group, NumberInput, Select, SimpleGrid, Stack, Textarea, TextInput } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { nomeCliente, type Cliente } from "@/types/cliente";
import { rotuloTipo, sugerirVencimento } from "@/lib/treinamentos";
import type { TipoTreinamento, Treinamento, TreinamentoInput } from "@/types/treinamento";

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

interface Props {
  treinamento?: Treinamento;
  clientes: Cliente[];
  tipos: TipoTreinamento[];
  /** Pré-seleciona o cliente e esconde o Select — usado na aba do cliente. */
  clienteFixo?: string;
  onSubmit: (input: TreinamentoInput) => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function TreinamentoForm({
  treinamento,
  clientes,
  tipos,
  clienteFixo,
  onSubmit,
  submitting,
  submitLabel = "Salvar",
}: Props) {
  // Vencimento sugerido automaticamente, mas sempre editável: um treinamento
  // pode ter validade diferente da padrão do tipo por exigência do cliente.
  const [vencimentoTocado, setVencimentoTocado] = useState(false);

  const form = useForm({
    initialValues: {
      clienteId: treinamento?.clienteId ?? clienteFixo ?? null,
      tipoTreinamentoId: treinamento?.tipoTreinamentoId ?? null,
      // Datas do Mantine v9 são strings "YYYY-MM-DD", nunca Date — a coluna é
      // `date` e passar por Date reintroduz erro de fuso (ver lib/treinamentos.ts).
      dataRealizacao: treinamento?.dataRealizacao ?? null,
      dataVencimento: treinamento?.dataVencimento ?? null,
      participantes: treinamento?.participantes ?? ("" as number | ""),
      instrutor: treinamento?.instrutor ?? "",
      observacoes: treinamento?.observacoes ?? "",
    },
    validate: {
      clienteId: (value) => (value ? null : "Escolha o cliente."),
      tipoTreinamentoId: (value) => (value ? null : "Escolha o tipo de treinamento."),
      dataRealizacao: (value) => (value ? null : "Informe a data de realização."),
      dataVencimento: (value, values) =>
        value && values.dataRealizacao && value < values.dataRealizacao
          ? "O vencimento não pode ser anterior à realização."
          : null,
    },
  });

  /** Recalcula o vencimento sugerido enquanto o usuário não o editou à mão. */
  function aplicarSugestao(tipoId: string | null, dataRealizacao: string | null) {
    if (vencimentoTocado || !tipoId || !dataRealizacao) return;
    const tipo = tipos.find((t) => t.id === tipoId);
    form.setFieldValue("dataVencimento", sugerirVencimento(dataRealizacao, tipo?.validadeMeses ?? null));
  }

  const tipoSelecionado = tipos.find((t) => t.id === form.values.tipoTreinamentoId);

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        onSubmit({
          clienteId: values.clienteId as string,
          tipoTreinamentoId: values.tipoTreinamentoId,
          // Snapshot do nome: renomear o tipo no catálogo não reescreve o histórico.
          tipoNome: tipos.find((t) => t.id === values.tipoTreinamentoId)?.nome ?? "",
          dataRealizacao: values.dataRealizacao as string,
          dataVencimento: values.dataVencimento,
          participantes: values.participantes === "" ? null : Number(values.participantes),
          instrutor: nullIfBlank(values.instrutor),
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

        <Select
          label="Tipo de treinamento"
          placeholder="Escolha a NR ou o curso"
          withAsterisk
          searchable
          data={tipos
            .filter((t) => t.ativo || t.id === treinamento?.tipoTreinamentoId)
            .map((t) => ({ value: t.id, label: rotuloTipo(t) }))}
          {...form.getInputProps("tipoTreinamentoId")}
          onChange={(value) => {
            form.setFieldValue("tipoTreinamentoId", value);
            aplicarSugestao(value, form.values.dataRealizacao);
          }}
          description={
            tipoSelecionado?.validadeMeses
              ? `Validade padrão: ${tipoSelecionado.validadeMeses} meses`
              : tipoSelecionado
                ? "Este tipo não tem validade definida"
                : undefined
          }
        />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <DateInput
            label="Data de realização"
            placeholder="DD/MM/AAAA"
            valueFormat="DD/MM/YYYY"
            withAsterisk
            {...form.getInputProps("dataRealizacao")}
            onChange={(value) => {
              form.setFieldValue("dataRealizacao", value);
              aplicarSugestao(form.values.tipoTreinamentoId, value);
            }}
          />
          <DateInput
            label="Vence em"
            placeholder="Sugerido pelo tipo"
            valueFormat="DD/MM/YYYY"
            clearable
            {...form.getInputProps("dataVencimento")}
            onChange={(value) => {
              setVencimentoTocado(true);
              form.setFieldValue("dataVencimento", value);
            }}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput label="Participantes" min={0} {...form.getInputProps("participantes")} />
          <TextInput label="Instrutor" {...form.getInputProps("instrutor")} />
        </SimpleGrid>

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
