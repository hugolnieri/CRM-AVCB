"use client";

import {
  Button,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { LEAD_ORIGENS } from "@/lib/pipeline/origens";
import { normalizePhoneToE164 } from "@/lib/phone";
import type { Lead, LeadInput } from "@/types/lead";
import type { TipoServico } from "@/types/servico";
import type { TeamMember } from "@/types/team";

/** Texto vazio vira null: "" numa coluna anulável só polui os dados. */
function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

interface Props {
  /** Ausente = criação. */
  lead?: Lead;
  tipos: TipoServico[];
  membros: TeamMember[];
  onSubmit: (input: Partial<LeadInput> & { name: string }) => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function LeadForm({
  lead,
  tipos,
  membros,
  onSubmit,
  submitting,
  submitLabel = "Salvar",
}: Props) {
  const form = useForm({
    initialValues: {
      name: lead?.name ?? "",
      contatoNome: lead?.contatoNome ?? "",
      cnpj: lead?.cnpj ?? "",
      phoneRaw: lead?.phoneRaw ?? "",
      email: lead?.email ?? "",
      address: lead?.address ?? "",
      cidade: lead?.cidade ?? "",
      uf: lead?.uf ?? "",
      origem: lead?.origem ?? null,
      interesse: lead?.interesse ?? "",
      possiveisServicos: lead?.possiveisServicos ?? [],
      assignedUserId: lead?.assignedUserId ?? null,
      valorEstimado: lead?.valorEstimado ?? ("" as number | ""),
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? "Informe o nome da empresa." : null),
      email: (value) =>
        value.trim() === "" || /^\S+@\S+\.\S+$/.test(value) ? null : "E-mail inválido.",
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        onSubmit({
          name: values.name.trim(),
          contatoNome: nullIfBlank(values.contatoNome),
          cnpj: nullIfBlank(values.cnpj),
          phoneRaw: nullIfBlank(values.phoneRaw),
          phoneE164: normalizePhoneToE164(values.phoneRaw),
          email: nullIfBlank(values.email),
          address: nullIfBlank(values.address),
          cidade: nullIfBlank(values.cidade),
          uf: nullIfBlank(values.uf),
          origem: values.origem,
          interesse: nullIfBlank(values.interesse),
          // Array vazio vira null: mantem a coluna limpa e o "nao informado"
          // com um valor so, em vez de distinguir [] de null sem motivo.
          possiveisServicos: values.possiveisServicos.length > 0 ? values.possiveisServicos : null,
          assignedUserId: values.assignedUserId,
          valorEstimado: values.valorEstimado === "" ? null : Number(values.valorEstimado),
        }),
      )}
    >
      <Stack>
        <TextInput
          label="Empresa"
          placeholder="Razão social ou nome fantasia"
          withAsterisk
          {...form.getInputProps("name")}
        />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label="Contato" placeholder="Nome de quem atende" {...form.getInputProps("contatoNome")} />
          <TextInput label="CNPJ" placeholder="00.000.000/0000-00" {...form.getInputProps("cnpj")} />
          <TextInput label="Telefone" placeholder="(15) 99999-8888" {...form.getInputProps("phoneRaw")} />
          <TextInput label="E-mail" placeholder="contato@empresa.com.br" {...form.getInputProps("email")} />
        </SimpleGrid>

        <TextInput label="Endereço" placeholder="Rua, número, bairro" {...form.getInputProps("address")} />

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput label="Cidade" {...form.getInputProps("cidade")} />
          <TextInput label="UF" maxLength={2} {...form.getInputProps("uf")} />
          <Select
            label="Origem"
            placeholder="Como chegou"
            data={LEAD_ORIGENS}
            searchable
            clearable
            {...form.getInputProps("origem")}
          />
        </SimpleGrid>

        <Textarea
          label="Interesse"
          placeholder="Que treinamento ou serviço procura"
          minRows={2}
          {...form.getInputProps("interesse")}
        />

        <MultiSelect
          label="Possíveis serviços"
          placeholder="O que faz sentido oferecer"
          description="Segue junto ao converter o lead em cliente"
          searchable
          clearable
          data={tipos.filter((t) => t.ativo).map((t) => t.nome)}
          {...form.getInputProps("possiveisServicos")}
        />

        <Select
          label="Responsável"
          placeholder="Quem cuida deste lead"
          clearable
          searchable
          data={membros.map((m) => ({ value: m.id, label: m.fullName }))}
          {...form.getInputProps("assignedUserId")}
        />

        <NumberInput
          label="Valor estimado (R$)"
          placeholder="Opcional"
          min={0}
          decimalScale={2}
          thousandSeparator="."
          decimalSeparator=","
          {...form.getInputProps("valorEstimado")}
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
