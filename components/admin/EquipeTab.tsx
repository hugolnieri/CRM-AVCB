"use client";

import { useState } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  CopyButton,
  Group,
  Loader,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import {
  IconCheck,
  IconCopy,
  IconKey,
  IconRefresh,
  IconUserPlus,
} from "@tabler/icons-react";
import { useCurrentMember, useTeamMembers } from "@/hooks/useCurrentMember";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import { criarAcesso, redefinirSenha, setMemberRole } from "@/lib/supabase/queries/team";
import { gerarSenha, validarConfirmacao, validarSenha } from "@/lib/senha";
import { exigirTexto, validarEmail } from "@/lib/validacao";
import type { TeamMember, UserRole } from "@/types/team";

const PERFIS = [
  { value: "admin", label: "Administrador" },
  { value: "colaborador", label: "Colaborador" },
];

/** O que mostrar depois de criar ou redefinir: a senha, para o admin copiar. */
interface SenhaEmMaos {
  email: string;
  senha: string;
  novoAcesso: boolean;
}

export function EquipeTab() {
  const { data: membros, isLoading } = useTeamMembers();
  const { data: eu } = useCurrentMember();

  const [novoAberto, { open: abrirNovo, close: fecharNovo }] = useDisclosure(false);
  const [redefinindo, setRedefinindo] = useState<TeamMember | null>(null);
  const [senhaEmMaos, setSenhaEmMaos] = useState<SenhaEmMaos | null>(null);

  const alterarPerfil = useCrudMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => setMemberRole(id, role),
    invalidate: [["teamMembers"], ["currentMember"]],
    successMessage: "Perfil de acesso atualizado.",
    errorMessage: "Erro ao alterar o perfil.",
  });

  const criar = useCrudMutation({
    mutationFn: (input: { fullName: string; email: string; senha: string; role: UserRole }) =>
      criarAcesso(input),
    invalidate: [["teamMembers"]],
    successMessage: "Acesso criado.",
    errorMessage: "Erro ao criar o acesso.",
  });

  const redefinir = useCrudMutation({
    mutationFn: ({ userId, senha }: { userId: string; senha: string }) =>
      redefinirSenha(userId, senha),
    invalidate: [["teamMembers"]],
    successMessage: "Senha redefinida.",
    errorMessage: "Erro ao redefinir a senha.",
  });

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <Text size="sm" c="dimmed" style={{ flex: 1 }}>
          Administradores mantêm o catálogo, alteram perfis, veem os relatórios e decidem as
          exclusões. Colaboradores fazem todo o resto do dia a dia.
        </Text>
        <Button leftSection={<IconUserPlus size={16} />} onClick={abrirNovo}>
          Novo membro
        </Button>
      </Group>

      <Table.ScrollContainer minWidth={720}>
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>E-mail</Table.Th>
              <Table.Th>Perfil</Table.Th>
              <Table.Th>Senha</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(membros ?? []).map((membro) => (
              <Table.Tr key={membro.id}>
                <Table.Td>{membro.fullName}</Table.Td>
                <Table.Td>{membro.email}</Table.Td>
                <Table.Td>
                  <Select
                    data={PERFIS}
                    value={membro.role}
                    allowDeselect={false}
                    // O banco também recusa (set_member_role levanta exceção),
                    // mas desabilitar evita o erro previsível.
                    disabled={membro.id === eu?.id || alterarPerfil.isPending}
                    onChange={(value) =>
                      value && alterarPerfil.mutate({ id: membro.id, role: value as UserRole })
                    }
                    w={180}
                  />
                </Table.Td>
                <Table.Td>
                  <Button
                    size="compact-sm"
                    variant="light"
                    color="gray"
                    leftSection={<IconKey size={14} />}
                    onClick={() => setRedefinindo(membro)}
                  >
                    Redefinir
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Text size="xs" c="dimmed">
        Você não pode alterar o próprio perfil — é o que impede o último administrador de trancar a
        equipe do lado de fora. Redefinir a própria senha, sim: use o botão da sua linha.
      </Text>

      {/* Novo acesso ------------------------------------------------------ */}
      <Modal
        opened={novoAberto}
        onClose={() => {
          fecharNovo();
          setSenhaEmMaos(null);
        }}
        title={<Title order={4}>Novo membro</Title>}
      >
        {senhaEmMaos?.novoAcesso ? (
          <SenhaPronta
            dados={senhaEmMaos}
            onFechar={() => {
              setSenhaEmMaos(null);
              fecharNovo();
            }}
          />
        ) : (
          <FormNovoMembro
            submitting={criar.isPending}
            onSubmit={(valores) =>
              criar.mutate(valores, {
                onSuccess: () =>
                  setSenhaEmMaos({
                    email: valores.email,
                    senha: valores.senha,
                    novoAcesso: true,
                  }),
              })
            }
          />
        )}
      </Modal>

      {/* Redefinir senha --------------------------------------------------- */}
      <Modal
        opened={redefinindo !== null}
        onClose={() => {
          setRedefinindo(null);
          setSenhaEmMaos(null);
        }}
        title={<Title order={4}>Redefinir senha</Title>}
      >
        {senhaEmMaos && !senhaEmMaos.novoAcesso ? (
          <SenhaPronta
            dados={senhaEmMaos}
            onFechar={() => {
              setSenhaEmMaos(null);
              setRedefinindo(null);
            }}
          />
        ) : (
          redefinindo && (
            <FormRedefinirSenha
              membro={redefinindo}
              ehVoce={redefinindo.id === eu?.id}
              submitting={redefinir.isPending}
              onSubmit={(senha) =>
                redefinir.mutate(
                  { userId: redefinindo.id, senha },
                  {
                    onSuccess: () =>
                      setSenhaEmMaos({
                        email: redefinindo.email,
                        senha,
                        novoAcesso: false,
                      }),
                  },
                )
              }
            />
          )
        )}
      </Modal>
    </Stack>
  );
}

/**
 * A senha só aparece aqui, uma vez.
 *
 * Ela não é recuperável depois — o Supabase guarda só o hash — então esta tela
 * segura o admin até ele copiar, em vez de fechar sozinha no sucesso.
 */
function SenhaPronta({ dados, onFechar }: { dados: SenhaEmMaos; onFechar: () => void }) {
  return (
    <Stack>
      <Alert color="green" icon={<IconCheck size={18} />} title={dados.novoAcesso ? "Acesso criado" : "Senha redefinida"}>
        Passe estes dados para a pessoa. A senha <strong>não aparece de novo</strong> depois que
        esta janela fechar — se perder, é só redefinir outra.
      </Alert>

      <LinhaCopiavel rotulo="E-mail" valor={dados.email} />
      <LinhaCopiavel rotulo="Senha" valor={dados.senha} destaque />

      <Text size="xs" c="dimmed">
        Peça para ela trocar por uma senha própria depois do primeiro acesso — qualquer
        administrador pode fazer isso por aqui.
      </Text>

      <Group justify="flex-end">
        <Button onClick={onFechar}>Concluir</Button>
      </Group>
    </Stack>
  );
}

function LinhaCopiavel({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Text size="sm" c="dimmed" w={60}>
        {rotulo}
      </Text>
      <Text
        size={destaque ? "lg" : "sm"}
        fw={destaque ? 700 : 500}
        ff={destaque ? "monospace" : undefined}
        style={{ flex: 1, wordBreak: "break-all" }}
      >
        {valor}
      </Text>
      <CopyButton value={valor}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? "Copiado" : "Copiar"} withArrow>
            <ActionIcon variant="subtle" color={copied ? "green" : "gray"} onClick={copy}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}

function FormNovoMembro({
  onSubmit,
  submitting,
}: {
  onSubmit: (v: { fullName: string; email: string; senha: string; role: UserRole }) => void;
  submitting: boolean;
}) {
  const form = useForm({
    initialValues: {
      fullName: "",
      email: "",
      // Já nasce preenchida: o caminho normal é o admin não escolher senha.
      senha: gerarSenha(),
      role: "colaborador" as UserRole,
    },
    validate: {
      fullName: (v) => exigirTexto(v, "Informe o nome completo."),
      email: (v) => exigirTexto(v, "Informe o e-mail.") ?? validarEmail(v),
      senha: validarSenha,
    },
  });

  return (
    <form onSubmit={form.onSubmit((v) => onSubmit({ ...v, email: v.email.trim().toLowerCase() }))}>
      <Stack>
        <TextInput label="Nome completo" withAsterisk {...form.getInputProps("fullName")} />
        <TextInput
          label="E-mail"
          placeholder="pessoa@antarestreinamentos.com.br"
          description="É com ele que a pessoa entra no sistema"
          withAsterisk
          {...form.getInputProps("email")}
        />

        <CampoSenha
          label="Senha inicial"
          descricao="Você passa esta senha para a pessoa; ela pode ser trocada depois"
          form={form}
          campo="senha"
        />

        <Select
          label="Perfil"
          data={PERFIS}
          allowDeselect={false}
          description="Colaborador é o padrão; administrador vê relatórios e decide exclusões"
          {...form.getInputProps("role")}
        />

        <Group justify="flex-end">
          <Button type="submit" loading={submitting}>
            Criar acesso
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function FormRedefinirSenha({
  membro,
  ehVoce,
  onSubmit,
  submitting,
}: {
  membro: TeamMember;
  ehVoce: boolean;
  onSubmit: (senha: string) => void;
  submitting: boolean;
}) {
  const form = useForm({
    initialValues: { senha: gerarSenha(), confirmacao: "" },
    validate: {
      senha: validarSenha,
      confirmacao: (v, valores) =>
        // Só exige confirmação quando o admin digitou à mão. Senha gerada e
        // copiada não precisa ser redigitada.
        v.trim() === "" ? null : validarConfirmacao(valores.senha, v),
    },
  });

  return (
    <form onSubmit={form.onSubmit((v) => onSubmit(v.senha))}>
      <Stack>
        <Text size="sm">
          Nova senha para <strong>{membro.fullName}</strong> ({membro.email}).
        </Text>

        {ehVoce && (
          <Alert color="yellow" variant="light">
            Esta é a sua própria senha. Você continua logado, mas vai precisar dela no próximo
            acesso — copie antes de fechar.
          </Alert>
        )}

        <CampoSenha label="Nova senha" form={form} campo="senha" />
        <PasswordInput
          label="Confirmar"
          description="Opcional — só se você digitou a senha à mão"
          {...form.getInputProps("confirmacao")}
        />

        <Group justify="flex-end">
          <Button type="submit" color="orange" loading={submitting}>
            Redefinir senha
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/**
 * Senha visível, e não mascarada: o admin precisa ler para transcrever. Não há
 * segredo a proteger da própria pessoa que a está definindo.
 */
function CampoSenha({
  label,
  descricao,
  form,
  campo,
}: {
  label: string;
  descricao?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  campo: string;
}) {
  return (
    <TextInput
      label={label}
      description={descricao}
      withAsterisk
      ff="monospace"
      rightSectionWidth={70}
      rightSection={
        <Group gap={2} wrap="nowrap">
          <Tooltip label="Gerar outra" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => form.setFieldValue(campo, gerarSenha())}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <CopyButton value={form.values[campo]}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? "Copiada" : "Copiar"} withArrow>
                <ActionIcon variant="subtle" color={copied ? "green" : "gray"} onClick={copy}>
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      }
      {...form.getInputProps(campo)}
    />
  );
}
