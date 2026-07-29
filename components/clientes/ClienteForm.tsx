"use client";

import {
  Button,
  Group,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
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
import type { Cliente, ClienteInput } from "@/types/cliente";
import type { TipoServico } from "@/types/servico";
import type { TeamMember } from "@/types/team";

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

interface Props {
  /** Cliente existente (edição) ou rascunho vindo de uma conversão de lead. */
  cliente?: Cliente;
  draft?: Partial<ClienteInput> & { razaoSocial: string };
  tipos: TipoServico[];
  membros: TeamMember[];
  onSubmit: (input: Partial<ClienteInput> & { razaoSocial: string }) => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function ClienteForm({
  cliente,
  draft,
  tipos,
  membros,
  onSubmit,
  submitting,
  submitLabel = "Salvar",
}: Props) {
  const base = cliente ?? draft;
  const { data: membroAtual } = useCurrentMember();

  const form = useForm({
    initialValues: {
      razaoSocial: base?.razaoSocial ?? "",
      nomeFantasia: base?.nomeFantasia ?? "",
      cnpj: base?.cnpj ?? "",
      contatoNome: base?.contatoNome ?? "",
      contatoCargo: base?.contatoCargo ?? "",
      telefone: base?.telefone ?? "",
      email: base?.email ?? "",
      endereco: base?.endereco ?? "",
      cidade: base?.cidade ?? "",
      uf: base?.uf ?? "",
      cep: base?.cep ?? "",
      responsavelId: base?.responsavelId ?? membroAtual?.id ?? null,
      possiveisServicos: base?.possiveisServicos ?? [],
      observacoes: base?.observacoes ?? "",
    },
    // As mesmas regras do LeadForm, pela razão explicada em lib/validacao.ts:
    // se o cadastro de cliente exigisse algo a mais, a conversão de lead
    // produziria um cliente que não passa no próprio formulário.
    validate: {
      razaoSocial: (value) => exigirTexto(value, "Informe a razão social."),
      contatoNome: (value) => exigirTexto(value, "Informe quem é o contato na empresa."),
      cnpj: validarCnpj,
      uf: validarUf,
      telefone: (value, values) => exigirContato(value, values.email) ?? validarTelefone(value),
      email: (value, values) => exigirContato(values.telefone, value) ?? validarEmail(value),
      responsavelId: (value) => (value ? null : "Escolha um responsável."),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        onSubmit({
          razaoSocial: values.razaoSocial.trim(),
          nomeFantasia: nullIfBlank(values.nomeFantasia),
          cnpj: nullIfBlank(values.cnpj),
          contatoNome: nullIfBlank(values.contatoNome),
          contatoCargo: nullIfBlank(values.contatoCargo),
          telefone: nullIfBlank(values.telefone),
          telefoneE164: normalizePhoneToE164(values.telefone),
          email: nullIfBlank(values.email),
          endereco: nullIfBlank(values.endereco),
          cidade: nullIfBlank(values.cidade),
          uf: nullIfBlank(values.uf),
          cep: nullIfBlank(values.cep),
          responsavelId: values.responsavelId,
          // Array vazio vira null: mantém a coluna limpa e o "não informado"
          // com um valor só, em vez de distinguir [] de null sem motivo.
          possiveisServicos: values.possiveisServicos.length > 0 ? values.possiveisServicos : null,
          observacoes: nullIfBlank(values.observacoes),
          ...(draft?.leadId ? { leadId: draft.leadId } : {}),
        }),
      )}
    >
      <Stack>
        <TextInput label="Razão social" withAsterisk {...form.getInputProps("razaoSocial")} />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label="Nome fantasia" {...form.getInputProps("nomeFantasia")} />
          <TextInput label="CNPJ" placeholder="00.000.000/0000-00" {...form.getInputProps("cnpj")} />
          <TextInput
            label="Contato"
            placeholder="Nome de quem atende"
            withAsterisk
            {...form.getInputProps("contatoNome")}
          />
          <TextInput label="Cargo do contato" {...form.getInputProps("contatoCargo")} />
          <TextInput
            label="Telefone"
            placeholder="(15) 99999-8888"
            description="Telefone ou e-mail — ao menos um"
            {...form.getInputProps("telefone")}
          />
          <TextInput
            label="E-mail"
            description="Telefone ou e-mail — ao menos um"
            {...form.getInputProps("email")}
          />
        </SimpleGrid>

        <TextInput label="Endereço" placeholder="Rua, número, bairro" {...form.getInputProps("endereco")} />

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput label="Cidade" {...form.getInputProps("cidade")} />
          <TextInput label="UF" maxLength={2} {...form.getInputProps("uf")} />
          <TextInput label="CEP" {...form.getInputProps("cep")} />
        </SimpleGrid>

        <Select
          label="Responsável"
          placeholder="Quem cuida desta conta"
          searchable
          withAsterisk
          data={membros.map((m) => ({ value: m.id, label: m.fullName }))}
          {...form.getInputProps("responsavelId")}
        />

        <MultiSelect
          label="Possíveis serviços"
          placeholder="O que ainda dá para oferecer"
          description="Não é o que já foi contratado — é a lista do que faz sentido vender"
          searchable
          clearable
          data={tipos.filter((t) => t.ativo).map((t) => t.nome)}
          {...form.getInputProps("possiveisServicos")}
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
