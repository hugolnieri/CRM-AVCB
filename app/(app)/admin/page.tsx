"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import {
  IconBell,
  IconChartBar,
  IconClockHour4,
  IconHistory,
  IconListDetails,
  IconMailForward,
  IconPlus,
  IconTargetArrow,
  IconUsers,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTeamMembers } from "@/hooks/useCurrentMember";
import { useCreateTipoServico, useServicos, useTiposServico, useUpdateTipoServico } from "@/hooks/useServicos";
import {
  useConfiguracoes,
  useNotificacoes,
  useRegistrosDiarios,
  useUpdateConfiguracoes,
} from "@/hooks/useJornada";
import { useActivitiesRecentes } from "@/hooks/useActivities";
import { RequireAdmin } from "@/components/shared/RequireAdmin";
import { MetasAdmin } from "@/components/metas/MetasAdmin";
import { AuditoriaTab } from "@/components/admin/AuditoriaTab";
import { EquipeTab } from "@/components/admin/EquipeTab";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { testarEnvio, type ResultadoEnvio } from "@/lib/supabase/queries/jornada";
import { getErrorMessage } from "@/lib/errors";
import { computeRelatorioDiario, totaisRelatorio, type LinhaRelatorio } from "@/lib/relatorioDiario";
import { NOTIFICACAO_LABELS } from "@/types/jornada";
import { CATEGORIA_LABELS, type CategoriaServico, type TipoServico } from "@/types/servico";
import type { ColumnDef } from "@tanstack/react-table";

export default function AdminPage() {
  return (
    <RequireAdmin>
      <Stack>
        <Title order={2}>Administração</Title>

        <Tabs defaultValue="relatorios">
          <Tabs.List>
            <Tabs.Tab value="relatorios" leftSection={<IconChartBar size={14} />}>
              Relatórios
            </Tabs.Tab>
            <Tabs.Tab value="metas" leftSection={<IconTargetArrow size={14} />}>
              Metas
            </Tabs.Tab>
            <Tabs.Tab value="jornada" leftSection={<IconClockHour4 size={14} />}>
              Jornada
            </Tabs.Tab>
            <Tabs.Tab value="equipe" leftSection={<IconUsers size={14} />}>
              Equipe
            </Tabs.Tab>
            <Tabs.Tab value="registro" leftSection={<IconHistory size={14} />}>
              Registro
            </Tabs.Tab>
            <Tabs.Tab value="notificacoes" leftSection={<IconBell size={14} />}>
              Notificações
            </Tabs.Tab>
            <Tabs.Tab value="tipos" leftSection={<IconListDetails size={14} />}>
              Catálogo
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="relatorios" pt="md">
            <RelatoriosTab />
          </Tabs.Panel>
          <Tabs.Panel value="metas" pt="md">
            <MetasAdmin />
          </Tabs.Panel>
          <Tabs.Panel value="registro" pt="md">
            <AuditoriaTab />
          </Tabs.Panel>
          <Tabs.Panel value="jornada" pt="md">
            <JornadaTab />
          </Tabs.Panel>
          <Tabs.Panel value="equipe" pt="md">
            <EquipeTab />
          </Tabs.Panel>
          <Tabs.Panel value="notificacoes" pt="md">
            <NotificacoesTab />
          </Tabs.Panel>
          <Tabs.Panel value="tipos" pt="md">
            <TiposTab />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </RequireAdmin>
  );
}

// --- Relatórios -------------------------------------------------------------

const PERIODOS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

function RelatoriosTab() {
  const [dias, setDias] = useState("30");
  const [membroId, setMembroId] = useState<string | null>(null);
  const { data: membros } = useTeamMembers();
  const { data: registros, isLoading } = useRegistrosDiarios();
  const { data: activities } = useActivitiesRecentes(Number(dias));
  const { data: servicos } = useServicos();

  const linhas = useMemo(() => {
    const todas = computeRelatorioDiario(
      {
        membros: membros ?? [],
        registros: registros ?? [],
        activities: activities ?? [],
        servicos: servicos ?? [],
      },
      Number(dias),
    );
    return membroId ? todas.filter((l) => l.memberId === membroId) : todas;
  }, [membros, registros, activities, servicos, dias, membroId]);

  const totais = useMemo(() => totaisRelatorio(linhas), [linhas]);

  const columns = useMemo<ColumnDef<LinhaRelatorio>[]>(
    () => [
      {
        accessorKey: "data",
        header: "Dia",
        cell: (c) => dayjs(c.getValue() as string).format("DD/MM/YYYY"),
      },
      { accessorKey: "nome", header: "Colaborador" },
      {
        id: "jornada",
        header: "Jornada",
        cell: (c) => {
          const l = c.row.original;
          if (!l.inicioAt) return <Text size="sm" c="dimmed">—</Text>;
          const fim = l.fimAt ? dayjs(l.fimAt).format("HH:mm") : "em aberto";
          return (
            <Text size="sm">
              {dayjs(l.inicioAt).format("HH:mm")} – {fim}
              {l.horas !== null && ` (${l.horas}h)`}
            </Text>
          );
        },
      },
      { accessorKey: "contatos", header: "Contatos" },
      { accessorKey: "fechamentos", header: "Fechamentos" },
      { accessorKey: "servicosRealizados", header: "Serviços" },
      {
        accessorKey: "observacoes",
        header: "Observações do dia",
        cell: (c) => (
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {(c.getValue() as string | null) ?? "—"}
          </Text>
        ),
      },
    ],
    [],
  );

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group align="flex-end" wrap="wrap">
        <Select
          label="Período"
          data={PERIODOS}
          value={dias}
          onChange={(v) => v && setDias(v)}
          allowDeselect={false}
          style={{ flex: "0 1 200px" }}
        />
        <Select
          label="Colaborador"
          placeholder="Todos"
          clearable
          searchable
          data={(membros ?? []).map((m) => ({ value: m.id, label: m.fullName }))}
          value={membroId}
          onChange={setMembroId}
          style={{ flex: "1 1 220px" }}
        />
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <StatCard label="Dias trabalhados" value={totais.diasTrabalhados} />
        <StatCard label="Contatos com leads" value={totais.contatos} />
        <StatCard label="Fechamentos" value={totais.fechamentos} color="green" />
        <StatCard label="Serviços realizados" value={totais.servicosRealizados} />
      </SimpleGrid>

      <Text size="xs" c="dimmed">
        Contato = ligação, WhatsApp, visita, nota ou follow-up registrados no histórico. Fechamento =
        lead convertido em cliente. Dias sem nenhum registro não aparecem.
      </Text>

      <DataTable
        data={linhas}
        columns={columns}
        emptyMessage="Nenhum registro no período."
        minWidth={900}
      />
    </Stack>
  );
}

// --- Jornada ----------------------------------------------------------------

function JornadaTab() {
  const { data: registros, isLoading } = useRegistrosDiarios();
  const { data: membros } = useTeamMembers();

  const nomePorId = useMemo(
    () => new Map((membros ?? []).map((m) => [m.id, m.fullName])),
    [membros],
  );

  if (isLoading) return <Loader />;

  const hoje = dayjs().format("YYYY-MM-DD");
  const deHoje = (registros ?? []).filter((r) => r.data === hoje);

  return (
    <Stack>
      <Title order={4}>Hoje</Title>
      {deHoje.length === 0 ? (
        <Text c="dimmed">Ninguém iniciou a jornada hoje ainda.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {deHoje.map((r) => (
            <StatCard
              key={r.id}
              label={nomePorId.get(r.memberId) ?? "Usuário removido"}
              value={r.fimAt ? "Finalizou" : "Trabalhando"}
              color={r.fimAt ? "gray" : "green"}
              hint={
                r.inicioAt
                  ? `Início ${dayjs(r.inicioAt).format("HH:mm")}${r.fimAt ? ` · fim ${dayjs(r.fimAt).format("HH:mm")}` : ""}`
                  : "Sem hora de início"
              }
            />
          ))}
        </SimpleGrid>
      )}

      <Title order={4} mt="md">
        Histórico
      </Title>
      <Table.ScrollContainer minWidth={700}>
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Dia</Table.Th>
              <Table.Th>Colaborador</Table.Th>
              <Table.Th>Início</Table.Th>
              <Table.Th>Fim</Table.Th>
              <Table.Th>Observações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(registros ?? []).map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>{dayjs(r.data).format("DD/MM/YYYY")}</Table.Td>
                <Table.Td>{nomePorId.get(r.memberId) ?? "Usuário removido"}</Table.Td>
                <Table.Td>{r.inicioAt ? dayjs(r.inicioAt).format("HH:mm") : "—"}</Table.Td>
                <Table.Td>{r.fimAt ? dayjs(r.fimAt).format("HH:mm") : "—"}</Table.Td>
                <Table.Td style={{ whiteSpace: "pre-wrap" }}>{r.observacoes ?? "—"}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {(registros ?? []).length === 0 && <Text c="dimmed">Nenhuma jornada registrada ainda.</Text>}
    </Stack>
  );
}

// --- Notificações -----------------------------------------------------------

/**
 * Traduz o motivo da falha para uma instrução.
 *
 * Os dois casos previsíveis têm causas opostas — chave ausente e chave válida
 * com destinatário recusado — e o segundo é o mais provável logo no começo:
 * sem domínio verificado o Resend só entrega no e-mail dono da conta. O texto
 * cru do provedor aparece junto de propósito, para um erro que eu não previ não
 * virar mensagem bonitinha e sem saída.
 */
function ExplicacaoFalha({ motivo, destino }: { motivo?: string; destino: string }) {
  if (motivo === "sem_provedor") {
    return (
      <Stack gap={4}>
        <Text size="sm">
          O servidor respondeu que não tem a chave. Ela existe na Vercel, mas variável de ambiente
          só passa a valer num <strong>build novo</strong>.
        </Text>
        <Text size="sm">
          Faça um <strong>Redeploy</strong> do último deploy na Vercel e teste de novo.
        </Text>
      </Stack>
    );
  }

  const recusaDeDestinatario =
    motivo !== undefined && /testing|verify a domain|own email|validation_error/i.test(motivo);

  return (
    <Stack gap={4}>
      {recusaDeDestinatario ? (
        <Text size="sm">
          A chave funciona, mas o Resend recusou o destinatário. Sem domínio verificado o remetente
          é <code>onboarding@resend.dev</code>, que só entrega no e-mail <strong>dono da conta
          Resend</strong>. Ou use esse endereço aqui, ou verifique o domínio de {destino.split("@")[1]}{" "}
          no Resend (Domains → Add).
        </Text>
      ) : (
        <Text size="sm">O provedor recusou o envio.</Text>
      )}
      {motivo && (
        <Text size="xs" c="dimmed" style={{ wordBreak: "break-word" }}>
          Resposta do servidor: {motivo}
        </Text>
      )}
    </Stack>
  );
}

function NotificacoesTab() {
  const { data: config, isLoading } = useConfiguracoes();
  const { data: notificacoes } = useNotificacoes();
  const { data: membros } = useTeamMembers();
  const update = useUpdateConfiguracoes();
  const [email, setEmail] = useState<string | null>(null);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnvio | null>(null);

  const nomePorId = useMemo(
    () => new Map((membros ?? []).map((m) => [m.id, m.fullName])),
    [membros],
  );

  if (isLoading || !config) return <Loader />;

  const valorEmail = email ?? config.emailNotificacoes ?? "";
  const algumaEnviada = (notificacoes ?? []).some((n) => n.enviadaEm !== null);

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Um endereço recebe os avisos da operação. Os eventos ficam registrados aqui mesmo sem
        e-mail configurado.
      </Text>

      <Group align="flex-end" wrap="wrap">
        <TextInput
          label="E-mail que recebe as notificações"
          placeholder="administrador@empresa.com.br"
          value={valorEmail}
          onChange={(e) => setEmail(e.currentTarget.value)}
          style={{ flex: "1 1 320px" }}
        />
        <Button
          loading={update.isPending}
          onClick={() =>
            update.mutate({ emailNotificacoes: valorEmail.trim() || null })
          }
        >
          Salvar
        </Button>
        <Button
          variant="default"
          leftSection={<IconMailForward size={16} />}
          loading={testando}
          disabled={valorEmail.trim() === ""}
          onClick={async () => {
            setTestando(true);
            setResultado(null);
            try {
              setResultado(await testarEnvio(valorEmail.trim()));
            } catch (err) {
              setResultado({ sent: false, reason: getErrorMessage(err, "Falha de rede.") });
            } finally {
              setTestando(false);
            }
          }}
        >
          Testar envio
        </Button>
      </Group>

      <Stack gap="xs">
        <Switch
          label="Avisar quando um colaborador inicia a jornada"
          checked={config.notificarInicioDia}
          onChange={(e) => update.mutate({ notificarInicioDia: e.currentTarget.checked })}
        />
        <Switch
          label="Avisar quando um colaborador finaliza o dia"
          checked={config.notificarFimDia}
          onChange={(e) => update.mutate({ notificarFimDia: e.currentTarget.checked })}
        />
        <Switch
          label="Avisar quando um lead é convertido em cliente"
          checked={config.notificarFechamento}
          onChange={(e) => update.mutate({ notificarFechamento: e.currentTarget.checked })}
        />
      </Stack>

      {/* O resultado do teste é a única evidência confiável: a chave do provedor
          é server-only, então esta tela não tem como saber se ela existe. */}
      {resultado && (
        <Alert
          color={resultado.sent ? "green" : "red"}
          title={resultado.sent ? "E-mail enviado" : "O envio falhou"}
          withCloseButton
          onClose={() => setResultado(null)}
        >
          {resultado.sent ? (
            <>Confira a caixa de entrada de {valorEmail}. Se não chegou, veja o spam.</>
          ) : (
            <ExplicacaoFalha motivo={resultado.reason} destino={valorEmail} />
          )}
        </Alert>
      )}

      {!algumaEnviada && (notificacoes ?? []).length > 0 && !resultado && (
        <Alert color="yellow" title="Nenhum e-mail saiu ainda">
          Os eventos abaixo foram registrados, mas nenhum deles chegou a ser enviado. Isso pode ser
          três coisas: são anteriores à configuração do provedor, a chave{" "}
          <code>RESEND_API_KEY</code> ainda não entrou num build novo, ou o provedor recusou o
          destinatário. Use <strong>Testar envio</strong> acima para descobrir qual — é o único
          jeito, porque esta tela roda no navegador e não enxerga a chave, que fica no servidor.
        </Alert>
      )}

      <Title order={4} mt="md">
        Histórico
      </Title>
      <Table.ScrollContainer minWidth={700}>
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Quando</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Evento</Table.Th>
              <Table.Th>Colaborador</Table.Th>
              <Table.Th>E-mail</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(notificacoes ?? []).map((n) => {
              const meta = NOTIFICACAO_LABELS[n.tipo] ?? { label: n.tipo, color: "gray" };
              return (
                <Table.Tr key={n.id}>
                  <Table.Td>{dayjs(n.createdAt).format("DD/MM/YYYY HH:mm")}</Table.Td>
                  <Table.Td>
                    <Badge color={meta.color} variant="light">
                      {meta.label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{n.titulo}</Table.Td>
                  <Table.Td>
                    {n.memberId ? (nomePorId.get(n.memberId) ?? "—") : "—"}
                  </Table.Td>
                  <Table.Td>
                    {n.enviadaEm ? (
                      <Badge color="green" variant="light">
                        Enviado
                      </Badge>
                    ) : (
                      <Badge color="gray" variant="outline">
                        Só registrado
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {(notificacoes ?? []).length === 0 && <Text c="dimmed">Nenhuma notificação ainda.</Text>}
    </Stack>
  );
}

// --- Catálogo ---------------------------------------------------------------

function TiposTab() {
  const { data: tipos, isLoading } = useTiposServico();
  const [novoOpened, { open: abrirNovo, close: fecharNovo }] = useDisclosure(false);
  const [emEdicao, setEmEdicao] = useState<TipoServico | null>(null);
  const create = useCreateTipoServico();
  const update = useUpdateTipoServico();

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          A validade em meses é o que faz o sistema sugerir a data de vencimento ao registrar um
          serviço. Alterar um tipo aqui não muda registros já feitos.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNovo}>
          Novo tipo
        </Button>
      </Group>

      <Table.ScrollContainer minWidth={760}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Sigla</Table.Th>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Natureza</Table.Th>
              <Table.Th>Validade</Table.Th>
              <Table.Th>Carga</Table.Th>
              <Table.Th>Situação</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(tipos ?? []).map((tipo) => (
              <Table.Tr key={tipo.id} onClick={() => setEmEdicao(tipo)} style={{ cursor: "pointer" }}>
                <Table.Td>{tipo.sigla ?? "—"}</Table.Td>
                <Table.Td>{tipo.nome}</Table.Td>
                <Table.Td>{CATEGORIA_LABELS[tipo.categoria]}</Table.Td>
                <Table.Td>{tipo.validadeMeses ? `${tipo.validadeMeses} meses` : "Não vence"}</Table.Td>
                <Table.Td>{tipo.cargaHoraria ? `${tipo.cargaHoraria}h` : "—"}</Table.Td>
                <Table.Td>
                  <Text size="sm" c={tipo.ativo ? undefined : "dimmed"}>
                    {tipo.ativo ? "Ativo" : "Inativo"}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Modal opened={novoOpened} onClose={fecharNovo} title={<Title order={3}>Novo tipo</Title>}>
        <TipoForm
          submitting={create.isPending}
          submitLabel="Criar"
          onSubmit={(input) => create.mutate(input, { onSuccess: fecharNovo })}
        />
      </Modal>

      <Modal
        opened={emEdicao !== null}
        onClose={() => setEmEdicao(null)}
        title={<Title order={3}>Editar tipo</Title>}
      >
        {emEdicao && (
          <TipoForm
            key={emEdicao.id}
            tipo={emEdicao}
            submitting={update.isPending}
            submitLabel="Salvar alterações"
            onSubmit={(patch) =>
              update.mutate({ id: emEdicao.id, patch }, { onSuccess: () => setEmEdicao(null) })
            }
          />
        )}
      </Modal>
    </Stack>
  );
}

type TipoFormValues = Omit<TipoServico, "id" | "createdAt">;

function TipoForm({
  tipo,
  onSubmit,
  submitting,
  submitLabel,
}: {
  tipo?: TipoServico;
  onSubmit: (input: TipoFormValues) => void;
  submitting?: boolean;
  submitLabel: string;
}) {
  const form = useForm({
    initialValues: {
      nome: tipo?.nome ?? "",
      sigla: tipo?.sigla ?? "",
      categoria: tipo?.categoria ?? ("treinamento" as CategoriaServico),
      validadeMeses: tipo?.validadeMeses ?? ("" as number | ""),
      cargaHoraria: tipo?.cargaHoraria ?? ("" as number | ""),
      ativo: tipo?.ativo ?? true,
      ordem: tipo?.ordem ?? 0,
    },
    validate: {
      nome: (value) => (value.trim().length < 2 ? "Informe o nome." : null),
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) =>
        onSubmit({
          nome: values.nome.trim(),
          sigla: values.sigla.trim() || null,
          categoria: values.categoria,
          validadeMeses: values.validadeMeses === "" ? null : Number(values.validadeMeses),
          cargaHoraria: values.cargaHoraria === "" ? null : Number(values.cargaHoraria),
          ativo: values.ativo,
          ordem: Number(values.ordem),
        }),
      )}
    >
      <Stack>
        <TextInput label="Nome" withAsterisk {...form.getInputProps("nome")} />
        <TextInput label="Sigla" placeholder="NR-35" {...form.getInputProps("sigla")} />
        <Select
          label="Natureza"
          data={Object.entries(CATEGORIA_LABELS).map(([value, label]) => ({ value, label }))}
          allowDeselect={false}
          description="Treinamento mostra campos de participantes e instrutor"
          {...form.getInputProps("categoria")}
        />
        <NumberInput
          label="Validade (meses)"
          placeholder="Deixe vazio se não vence"
          min={1}
          {...form.getInputProps("validadeMeses")}
        />
        <NumberInput label="Carga horária (h)" min={0} {...form.getInputProps("cargaHoraria")} />
        <NumberInput
          label="Ordem na lista"
          min={0}
          description="Menor aparece primeiro"
          {...form.getInputProps("ordem")}
        />
        <Switch
          label="Ativo"
          description="Tipos inativos não aparecem ao registrar um serviço novo"
          {...form.getInputProps("ativo", { type: "checkbox" })}
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
