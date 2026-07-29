"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconUserShare } from "@tabler/icons-react";
import dayjs from "dayjs";
import { TarefaForm } from "@/components/tarefas/TarefaForm";
import { AdminDeleteButton } from "@/components/shared/AdminDeleteButton";
import { useTarefas, useConcluirTarefa, useCreateTarefa, useDeleteTarefa, useUpdateTarefa } from "@/hooks/useTarefas";
import { useCurrentMember, useTeamMembers } from "@/hooks/useCurrentMember";
import { etiquetaDoItem, filtrarTarefas, listaDeTarefas, type ItemTarefa } from "@/lib/tarefas";
import { PRIORIDADE_LABELS, type Tarefa, type TarefaInput } from "@/types/tarefa";
import type { Pendencia } from "@/lib/painel";

/**
 * A lista única de trabalho pendente: tarefas digitadas por alguém e pendências
 * que o sistema calcula sozinho. Ver o cabeçalho de lib/tarefas.ts para por que
 * as automáticas não viram linha no banco.
 */
export function TarefasPanel({ pendencias }: { pendencias: Pendencia[] }) {
  const router = useRouter();
  const { data: tarefas } = useTarefas();
  const { data: membros } = useTeamMembers();
  const { data: member } = useCurrentMember();

  const [escopo, setEscopo] = useState<"minhas" | "admin" | "todas">("minhas");
  const [incluirConcluidas, setIncluirConcluidas] = useState(false);
  const [novaAberta, { open: abrirNova, close: fecharNova }] = useDisclosure(false);
  const [emEdicao, setEmEdicao] = useState<Tarefa | null>(null);
  const [delegando, setDelegando] = useState<ItemTarefa | null>(null);

  const criar = useCreateTarefa();
  const atualizar = useUpdateTarefa();
  const concluir = useConcluirTarefa();
  const remover = useDeleteTarefa();

  const isAdmin = member?.role === "admin";

  const itens = useMemo(
    () => listaDeTarefas({ tarefas: tarefas ?? [], pendencias }),
    [tarefas, pendencias],
  );

  const visiveis = useMemo(
    () =>
      filtrarTarefas(itens, {
        memberId: member?.id ?? null,
        isAdmin,
        escopo,
        incluirConcluidas,
      }),
    [itens, member, isAdmin, escopo, incluirConcluidas],
  );

  const nomePorId = useMemo(
    () => new Map((membros ?? []).map((m) => [m.id, m.fullName])),
    [membros],
  );

  const opcoesEscopo = [
    { value: "minhas", label: "Minhas" },
    ...(isAdmin ? [{ value: "admin", label: "Da administração" }] : []),
    { value: "todas", label: "Todas" },
  ];

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <SegmentedControl
          value={escopo}
          onChange={(v) => setEscopo(v as typeof escopo)}
          data={opcoesEscopo}
        />
        <Group>
          <Switch
            label="Mostrar concluídas"
            checked={incluirConcluidas}
            onChange={(e) => setIncluirConcluidas(e.currentTarget.checked)}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={abrirNova}>
            Nova tarefa
          </Button>
        </Group>
      </Group>

      {visiveis.length === 0 ? (
        <Text c="dimmed">
          {escopo === "minhas"
            ? "Nada atribuído a você. Veja em “Todas” o que está aberto no time."
            : "Nada pendente por aqui."}
        </Text>
      ) : (
        <Stack gap="xs">
          {visiveis.map((item) => (
            <LinhaTarefa
              key={item.id}
              item={item}
              nomePorId={nomePorId}
              podeConcluir={isAdmin || item.responsavelId === member?.id}
              onAbrir={() => item.href && router.push(item.href)}
              onEditar={() => item.tarefa && setEmEdicao(item.tarefa)}
              onDelegar={() => setDelegando(item)}
              onConcluir={(concluida) =>
                item.tarefa && concluir.mutate({ id: item.tarefa.id, concluida })
              }
            />
          ))}
        </Stack>
      )}

      <Modal
        opened={novaAberta}
        onClose={fecharNova}
        title={<Title order={4}>Nova tarefa</Title>}
        size="lg"
      >
        <TarefaForm
          membros={membros ?? []}
          submitting={criar.isPending}
          submitLabel="Criar"
          onSubmit={(input) => criar.mutate(input, { onSuccess: fecharNova })}
        />
      </Modal>

      {/* Delegar: a pendência calculada vira tarefa de verdade, com dono e
          prazo. A automática some da lista no instante seguinte, porque
          listaDeTarefas descarta a que já tem tarefa aberta apontando. */}
      <Modal
        opened={delegando !== null}
        onClose={() => setDelegando(null)}
        title={<Title order={4}>Delegar pendência</Title>}
        size="lg"
      >
        {delegando && (
          <Stack>
            <Text size="sm" c="dimmed">
              Vira uma tarefa com responsável e prazo. Some daqui quando alguém concluir — ou
              antes, se o dado que a gerou for corrigido.
            </Text>
            <TarefaForm
              membros={membros ?? []}
              draft={{
                titulo: delegando.titulo,
                origemPendencia: delegando.pendenciaId ?? null,
                prioridade: "alta",
              }}
              submitting={criar.isPending}
              submitLabel="Delegar"
              onSubmit={(input) =>
                criar.mutate(input, { onSuccess: () => setDelegando(null) })
              }
            />
          </Stack>
        )}
      </Modal>

      <Modal
        opened={emEdicao !== null}
        onClose={() => setEmEdicao(null)}
        title={<Title order={4}>Editar tarefa</Title>}
        size="lg"
      >
        {emEdicao && (
          <Stack>
            <TarefaForm
              key={emEdicao.id}
              tarefa={emEdicao}
              membros={membros ?? []}
              submitting={atualizar.isPending}
              submitLabel="Salvar alterações"
              onSubmit={(patch: Partial<TarefaInput>) =>
                atualizar.mutate(
                  { id: emEdicao.id, patch },
                  { onSuccess: () => setEmEdicao(null) },
                )
              }
            />
            <Group>
              <AdminDeleteButton
                loading={remover.isPending}
                label="Excluir tarefa"
                confirmText="A tarefa some para todo mundo. O registro fica no log de auditoria."
                onConfirm={() =>
                  remover.mutate(emEdicao.id, { onSuccess: () => setEmEdicao(null) })
                }
              />
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

function LinhaTarefa({
  item,
  nomePorId,
  podeConcluir,
  onAbrir,
  onEditar,
  onDelegar,
  onConcluir,
}: {
  item: ItemTarefa;
  nomePorId: Map<string, string>;
  podeConcluir: boolean;
  onAbrir: () => void;
  onEditar: () => void;
  onDelegar: () => void;
  onConcluir: (concluida: boolean) => void;
}) {
  const etiqueta = etiquetaDoItem(item);
  const automatica = item.origem === "automatica";
  const prioridade = PRIORIDADE_LABELS[item.prioridade];

  return (
    <Card
      withBorder
      padding="sm"
      radius="md"
      style={{
        borderLeft: `3px solid var(--mantine-color-${item.atrasada ? "red" : automatica ? (etiqueta?.color ?? "gray") : prioridade.color}-6)`,
        opacity: item.concluida ? 0.6 : 1,
      }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap="sm" wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
          {/* Automática não tem caixa: ela fecha corrigindo o dado, não
              marcando um visto. */}
          {!automatica && (
            <Checkbox
              checked={item.concluida}
              disabled={!podeConcluir}
              onChange={(e) => onConcluir(e.currentTarget.checked)}
              mt={2}
            />
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <Text
              size="sm"
              fw={500}
              td={item.concluida ? "line-through" : undefined}
              style={{ cursor: item.href ? "pointer" : undefined }}
              onClick={item.href ? onAbrir : undefined}
            >
              {item.titulo}
            </Text>

            <Group gap="xs" mt={4}>
              {automatica ? (
                <Badge color={etiqueta?.color} variant="light" size="sm">
                  {etiqueta?.label ?? "Automática"}
                </Badge>
              ) : (
                <>
                  {item.prioridade !== "normal" && (
                    <Badge color={prioridade.color} variant="light" size="sm">
                      {prioridade.label}
                    </Badge>
                  )}
                  <Text size="xs" c="dimmed">
                    {item.responsavelId
                      ? (nomePorId.get(item.responsavelId) ?? "Removido")
                      : "Administração"}
                  </Text>
                </>
              )}

              {item.prazo && (
                <Text size="xs" c={item.atrasada ? "red" : "dimmed"} fw={item.atrasada ? 600 : 400}>
                  {item.atrasada ? "Venceu em " : "até "}
                  {dayjs(item.prazo).format("DD/MM/YYYY")}
                </Text>
              )}

              {item.tarefa?.descricao && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  · {item.tarefa.descricao}
                </Text>
              )}
            </Group>
          </div>
        </Group>

        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          {automatica ? (
            <Button
              size="compact-sm"
              variant="light"
              leftSection={<IconUserShare size={14} />}
              onClick={onDelegar}
            >
              Delegar
            </Button>
          ) : (
            <Button size="compact-sm" variant="subtle" color="gray" onClick={onEditar}>
              Editar
            </Button>
          )}
        </Group>
      </Group>
    </Card>
  );
}
