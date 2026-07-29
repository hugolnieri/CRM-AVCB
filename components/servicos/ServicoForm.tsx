"use client";

import { useState } from "react";
import {
  Button,
  Group,
  NumberInput,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { DateInput, DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import dayjs from "dayjs";
import { nomeCliente, type Cliente } from "@/types/cliente";
import { opcoesDeMembro } from "@/lib/equipe";
import { sugerirVencimento } from "@/lib/servicos";
import { rotuloTipo, type Servico, type ServicoInput, type ServicoStatus, type TipoServico } from "@/types/servico";
import type { TeamMember } from "@/types/team";

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

interface Props {
  servico?: Servico;
  clientes: Cliente[];
  tipos: TipoServico[];
  membros: TeamMember[];
  /** Pré-seleciona o cliente e esconde o Select — usado na aba do cliente. */
  clienteFixo?: string;
  /** Status inicial quando é um registro novo. A Agenda abre em "agendado". */
  statusInicial?: ServicoStatus;
  onSubmit: (input: ServicoInput) => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function ServicoForm({
  servico,
  clientes,
  tipos,
  membros,
  clienteFixo,
  statusInicial = "realizado",
  onSubmit,
  submitting,
  submitLabel = "Salvar",
}: Props) {
  // Vencimento sugerido automaticamente, mas sempre editável: um serviço pode
  // ter validade diferente da padrão do tipo por exigência do cliente.
  const [vencimentoTocado, setVencimentoTocado] = useState(false);

  const form = useForm({
    initialValues: {
      clienteId: servico?.clienteId ?? clienteFixo ?? null,
      tipoServicoId: servico?.tipoServicoId ?? null,
      status: servico?.status ?? statusInicial,
      // DateTimePicker do Mantine v9 usa string "YYYY-MM-DD HH:mm:ss", não Date.
      dataAgendada: servico?.dataAgendada
        ? dayjs(servico.dataAgendada).format("YYYY-MM-DD HH:mm:ss")
        : null,
      // DateInput usa "YYYY-MM-DD" — colunas `date`, sem passar por Date (fuso).
      dataRealizacao: servico?.dataRealizacao ?? null,
      dataVencimento: servico?.dataVencimento ?? null,
      participantes: servico?.participantes ?? ("" as number | ""),
      instrutor: servico?.instrutor ?? "",
      responsavelId: servico?.responsavelId ?? null,
      observacoes: servico?.observacoes ?? "",
    },
    validate: {
      clienteId: (value) => (value ? null : "Escolha o cliente."),
      tipoServicoId: (value) => (value ? null : "Escolha o tipo."),
      // As mesmas regras que a constraint servicos_datas_por_status impõe no
      // banco, aqui só para o erro chegar antes do round-trip.
      dataAgendada: (value, values) =>
        values.status === "agendado" && !value ? "Informe a data e hora do agendamento." : null,
      dataRealizacao: (value, values) =>
        values.status === "realizado" && !value ? "Informe a data de realização." : null,
      dataVencimento: (value, values) =>
        value && values.dataRealizacao && value < values.dataRealizacao
          ? "O vencimento não pode ser anterior à realização."
          : null,
    },
  });

  const tipoSelecionado = tipos.find((t) => t.id === form.values.tipoServicoId);
  const isTreinamento = tipoSelecionado?.categoria === "treinamento";
  const isAgendado = form.values.status === "agendado";

  /** Recalcula o vencimento sugerido enquanto o usuário não o editou à mão. */
  function aplicarSugestao(tipoId: string | null, dataRealizacao: string | null) {
    if (vencimentoTocado || !tipoId || !dataRealizacao) return;
    const tipo = tipos.find((t) => t.id === tipoId);
    form.setFieldValue("dataVencimento", sugerirVencimento(dataRealizacao, tipo?.validadeMeses ?? null));
  }

  // Agrupa o catálogo por natureza para o Select não virar uma lista de 27 itens.
  const dadosTipo = [
    {
      group: "Treinamentos",
      items: tipos
        .filter((t) => t.categoria === "treinamento" && (t.ativo || t.id === servico?.tipoServicoId))
        .map((t) => ({ value: t.id, label: rotuloTipo(t) })),
    },
    {
      group: "Serviços",
      items: tipos
        .filter((t) => t.categoria === "servico" && (t.ativo || t.id === servico?.tipoServicoId))
        .map((t) => ({ value: t.id, label: rotuloTipo(t) })),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        const agendado = values.status === "agendado";
        onSubmit({
          clienteId: values.clienteId as string,
          tipoServicoId: values.tipoServicoId,
          // Snapshot: renomear o tipo no catálogo não reescreve o histórico.
          tipoNome: tipos.find((t) => t.id === values.tipoServicoId)?.nome ?? "",
          status: values.status,
          // Só uma das duas datas sobrevive, conforme o status — é o que a
          // constraint do banco exige e o que evita o item aparecer duplicado
          // entre a agenda e o histórico.
          dataAgendada: agendado ? dayjs(values.dataAgendada).toISOString() : null,
          dataRealizacao: agendado ? null : values.dataRealizacao,
          dataVencimento: agendado ? null : values.dataVencimento,
          participantes: values.participantes === "" ? null : Number(values.participantes),
          instrutor: nullIfBlank(values.instrutor),
          responsavelId: values.responsavelId,
          observacoes: nullIfBlank(values.observacoes),
        });
      })}
    >
      <Stack>
        <SegmentedControl
          fullWidth
          data={[
            { value: "agendado", label: "Agendar" },
            { value: "realizado", label: "Já realizado" },
            ...(servico ? [{ value: "cancelado", label: "Cancelado" }] : []),
          ]}
          {...form.getInputProps("status")}
        />

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
          label="Tipo"
          placeholder="Treinamento ou serviço"
          withAsterisk
          searchable
          data={dadosTipo}
          {...form.getInputProps("tipoServicoId")}
          onChange={(value) => {
            form.setFieldValue("tipoServicoId", value);
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

        {isAgendado ? (
          <DateTimePicker
            label="Data e hora do compromisso"
            placeholder="Escolha data e hora"
            valueFormat="DD/MM/YYYY HH:mm"
            withAsterisk
            defaultTimeValue={dayjs().format("HH:mm")}
            clearable
            description="Aparece na Agenda. O vencimento é definido ao concluir."
            {...form.getInputProps("dataAgendada")}
          />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <DateInput
              label="Data de realização"
              placeholder="DD/MM/AAAA"
              valueFormat="DD/MM/YYYY"
              withAsterisk
              {...form.getInputProps("dataRealizacao")}
              onChange={(value) => {
                form.setFieldValue("dataRealizacao", value);
                aplicarSugestao(form.values.tipoServicoId, value);
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
        )}

        {/* Participantes e instrutor só fazem sentido em treinamento — um laudo
            de insalubridade não tem turma. */}
        {isTreinamento && (
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <NumberInput label="Participantes" min={0} {...form.getInputProps("participantes")} />
            <TextInput label="Instrutor" {...form.getInputProps("instrutor")} />
          </SimpleGrid>
        )}

        <Select
          label="Responsável"
          placeholder="Quem executa"
          clearable
          searchable
          data={opcoesDeMembro(membros, form.values.responsavelId)}
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
