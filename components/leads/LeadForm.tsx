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
import {
  exigirContato,
  exigirTexto,
  validarCnpj,
  validarEmail,
  validarTelefone,
  validarUf,
} from "@/lib/validacao";
import { useCurrentMember } from "@/hooks/useCurrentMember";
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
  const { data: membroAtual } = useCurrentMember();

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
      // Na criação já nasce com quem está cadastrando. Lead sem dono não conta
      // para ninguém na métrica `leads_novos` de lib/metas.ts.
      assignedUserId: lead?.assignedUserId ?? membroAtual?.id ?? null,
      valorEstimado: lead?.valorEstimado ?? ("" as number | ""),
    },
    validate: {
      name: (value) => exigirTexto(value, "Informe o nome da empresa."),
      contatoNome: (value) => exigirTexto(value, "Informe quem é o contato na empresa."),
      cnpj: validarCnpj,
      uf: validarUf,
      // Telefone e e-mail são um par: a regra do par acende nos dois campos, e
      // cada um valida o próprio formato por cima disso.
      phoneRaw: (value, values) =>
        exigirContato(value, values.email) ?? validarTelefone(value),
      email: (value, values) => exigirContato(values.phoneRaw, value) ?? validarEmail(value),
      origem: (value) => (value ? null : "Informe como o lead chegou."),
      assignedUserId: (value) => (value ? null : "Escolha um responsável."),
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
          <TextInput
            label="Contato"
            placeholder="Nome de quem atende"
            withAsterisk
            {...form.getInputProps("contatoNome")}
          />
          <TextInput label="CNPJ" placeholder="00.000.000/0000-00" {...form.getInputProps("cnpj")} />
          <TextInput
            label="Telefone"
            placeholder="(15) 99999-8888"
            description="Telefone ou e-mail — ao menos um"
            {...form.getInputProps("phoneRaw")}
          />
          <TextInput
            label="E-mail"
            placeholder="contato@empresa.com.br"
            description="Telefone ou e-mail — ao menos um"
            {...form.getInputProps("email")}
          />
        </SimpleGrid>

        <TextInput label="Endereço" placeholder="Rua, número, bairro" {...form.getInputProps("address")} />

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput
            label="Cidade"
            description="Posiciona o lead no mapa do pipeline"
            {...form.getInputProps("cidade")}
          />
          <TextInput label="UF" maxLength={2} {...form.getInputProps("uf")} />
          <Select
            label="Origem"
            placeholder="Como chegou"
            data={LEAD_ORIGENS}
            searchable
            withAsterisk
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
          searchable
          withAsterisk
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
