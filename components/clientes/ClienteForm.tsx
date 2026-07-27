"use client";

import { Button, Group, SimpleGrid, Stack, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { normalizePhoneToE164 } from "@/lib/phone";
import type { Cliente, ClienteInput } from "@/types/cliente";

function nullIfBlank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

interface Props {
  /** Cliente existente (edição) ou rascunho vindo de uma conversão de lead. */
  cliente?: Cliente;
  draft?: Partial<ClienteInput> & { razaoSocial: string };
  onSubmit: (input: Partial<ClienteInput> & { razaoSocial: string }) => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function ClienteForm({ cliente, draft, onSubmit, submitting, submitLabel = "Salvar" }: Props) {
  const base = cliente ?? draft;

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
      observacoes: base?.observacoes ?? "",
    },
    validate: {
      razaoSocial: (value) => (value.trim().length < 2 ? "Informe a razão social." : null),
      email: (value) =>
        value.trim() === "" || /^\S+@\S+\.\S+$/.test(value) ? null : "E-mail inválido.",
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
          observacoes: nullIfBlank(values.observacoes),
          // Preservado só na conversão; na edição `draft` é undefined e a chave
          // nem entra no patch, então o vínculo existente não é tocado.
          ...(draft?.leadId ? { leadId: draft.leadId } : {}),
        }),
      )}
    >
      <Stack>
        <TextInput label="Razão social" withAsterisk {...form.getInputProps("razaoSocial")} />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label="Nome fantasia" {...form.getInputProps("nomeFantasia")} />
          <TextInput label="CNPJ" placeholder="00.000.000/0000-00" {...form.getInputProps("cnpj")} />
          <TextInput label="Contato" placeholder="Nome de quem atende" {...form.getInputProps("contatoNome")} />
          <TextInput label="Cargo do contato" {...form.getInputProps("contatoCargo")} />
          <TextInput label="Telefone" placeholder="(15) 99999-8888" {...form.getInputProps("telefone")} />
          <TextInput label="E-mail" {...form.getInputProps("email")} />
        </SimpleGrid>

        <TextInput label="Endereço" placeholder="Rua, número, bairro" {...form.getInputProps("endereco")} />

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput label="Cidade" {...form.getInputProps("cidade")} />
          <TextInput label="UF" maxLength={2} {...form.getInputProps("uf")} />
          <TextInput label="CEP" {...form.getInputProps("cep")} />
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
