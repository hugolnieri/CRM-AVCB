"use client";

import { useMemo } from "react";
import {
  Alert,
  Button,
  Grid,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconSparkles } from "@tabler/icons-react";
import { LEAD_ORIGENS } from "@/lib/pipeline/origens";
import { normalizePhoneToE164 } from "@/lib/phone";
import { servicosParaCnae, validarCnae } from "@/lib/cnae";
import { CnaeInput } from "@/components/shared/CnaeInput";
import {
  exigirContato,
  exigirTexto,
  validarCnpj,
  validarEmail,
  validarTelefone,
  UF_OPCOES,
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
      cnae: lead?.cnae ?? "",
      cnaeDescricao: lead?.cnaeDescricao ?? "",
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
      cnae: validarCnae,
      // Telefone e e-mail são um par: a regra do par acende nos dois campos, e
      // cada um valida o próprio formato por cima disso.
      phoneRaw: (value, values) => exigirContato(value, values.email) ?? validarTelefone(value),
      email: (value, values) => exigirContato(values.phoneRaw, value) ?? validarEmail(value),
      origem: (value) => (value ? null : "Informe como o lead chegou."),
      assignedUserId: (value) => (value ? null : "Escolha um responsável."),
    },
  });

  const sugeridos = useMemo(
    () => servicosParaCnae(form.values.cnae, tipos),
    [form.values.cnae, tipos],
  );

  // Só o que ainda não está marcado — sugerir o que já foi escolhido é ruído.
  const novosSugeridos = sugeridos
    .map((t) => t.nome)
    .filter((nome) => !form.values.possiveisServicos.includes(nome));

  const nomesAtivos = useMemo(
    () => tipos.filter((t) => t.ativo).map((t) => t.nome),
    [tipos],
  );

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        onSubmit({
          name: values.name.trim(),
          contatoNome: nullIfBlank(values.contatoNome),
          cnpj: nullIfBlank(values.cnpj),
          cnae: nullIfBlank(values.cnae),
          cnaeDescricao: nullIfBlank(values.cnaeDescricao),
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

        {/* Cada linha do formulário é um Grid de 12 colunas, e não SimpleGrid:
            campos de larguras diferentes (UF ao lado de Cidade) precisam de
            proporção, e descrição sob um campo só desalinharia a linha inteira
            num grid de colunas iguais. */}
        <Grid gap="sm">
          <Grid.Col span={{ base: 12, sm: 7 }}>
            <TextInput
              label="Contato"
              placeholder="Nome de quem atende"
              withAsterisk
              {...form.getInputProps("contatoNome")}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <TextInput
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              {...form.getInputProps("cnpj")}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <Select
              label="Origem"
              placeholder="Como chegou"
              data={LEAD_ORIGENS}
              searchable
              withAsterisk
              {...form.getInputProps("origem")}
            />
          </Grid.Col>
        </Grid>

        <CnaeInput
          codigo={form.values.cnae}
          descricao={form.values.cnaeDescricao}
          error={form.errors.cnae}
          onChange={({ codigo, descricao }) => {
            form.setFieldValue("cnae", codigo);
            form.setFieldValue("cnaeDescricao", descricao);
          }}
        />

        {novosSugeridos.length > 0 && (
          <Alert color="blue" variant="light" icon={<IconSparkles size={18} />} p="sm">
            <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
              <Text size="sm">
                Pelo CNAE, esta empresa costuma precisar de{" "}
                <strong>{novosSugeridos.join(", ")}</strong>.
              </Text>
              <Button
                size="compact-sm"
                variant="light"
                style={{ flexShrink: 0 }}
                onClick={() =>
                  form.setFieldValue("possiveisServicos", [
                    ...form.values.possiveisServicos,
                    ...novosSugeridos,
                  ])
                }
              >
                Adicionar
              </Button>
            </Group>
          </Alert>
        )}

        <Grid gap="sm">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="Telefone"
              placeholder="(15) 99999-8888"
              {...form.getInputProps("phoneRaw")}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="E-mail"
              placeholder="contato@empresa.com.br"
              {...form.getInputProps("email")}
            />
          </Grid.Col>
        </Grid>
        {/* Uma linha só para a regra do par, em vez da mesma frase repetida sob
            os dois campos — que era o que empurrava um input para baixo do
            outro. */}
        <Text size="xs" c="dimmed" mt={-8}>
          Informe ao menos um dos dois: é por onde a equipe fala com a empresa.
        </Text>

        <TextInput
          label="Endereço"
          placeholder="Rua, número, bairro"
          {...form.getInputProps("address")}
        />

        <Grid gap="sm">
          <Grid.Col span={{ base: 12, sm: 8 }}>
            <TextInput label="Cidade" placeholder="Sorocaba" {...form.getInputProps("cidade")} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Select
              label="UF"
              placeholder="SP"
              data={UF_OPCOES}
              searchable
              clearable
              {...form.getInputProps("uf")}
            />
          </Grid.Col>
        </Grid>
        <Text size="xs" c="dimmed" mt={-8}>
          Cidade e UF posicionam o lead no mapa do pipeline.
        </Text>

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
          data={nomesAtivos}
          {...form.getInputProps("possiveisServicos")}
        />

        <Grid gap="sm">
          <Grid.Col span={{ base: 12, sm: 7 }}>
            <Select
              label="Responsável"
              placeholder="Quem cuida deste lead"
              searchable
              withAsterisk
              data={membros.map((m) => ({ value: m.id, label: m.fullName }))}
              {...form.getInputProps("assignedUserId")}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <NumberInput
              label="Valor estimado (R$)"
              placeholder="Opcional"
              min={0}
              decimalScale={2}
              thousandSeparator="."
              decimalSeparator=","
              {...form.getInputProps("valorEstimado")}
            />
          </Grid.Col>
        </Grid>

        <Group justify="flex-end">
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
