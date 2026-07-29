"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { AdminDeleteButton } from "@/components/shared/AdminDeleteButton";
import { useCurrentMember, useTeamMembers } from "@/hooks/useCurrentMember";
import {
  useAprovarExclusao,
  useExcluirDireto,
  useRecusarExclusao,
  useSolicitacoesExclusao,
  useSolicitarExclusao,
} from "@/hooks/useExclusoes";
import {
  ENTIDADE_LABELS,
  SOLICITACAO_STATUS_LABELS,
  type EntidadeExcluivel,
  type SolicitacaoExclusao,
} from "@/types/exclusao";

interface Props {
  entidade: EntidadeExcluivel;
  registroId: string;
  /** Nome mostrado na confirmação e guardado no pedido. */
  rotulo: string;
  /** O que cascateia junto, para a confirmação dizer o tamanho do estrago. */
  cascata?: string;
  /** Chamado depois de uma exclusão de fato — a tela precisa sair do registro. */
  onExcluido?: () => void;
}

/**
 * Exclusão de lead ou cliente, nos três estados possíveis:
 *
 * - **admin** — exclui na hora, com a confirmação dizendo o que vai junto;
 * - **colaborador** — só pede, com motivo. A RLS não o deixa apagar nem pelo
 *   console, então o pedido é o caminho, não uma etiqueta de cortesia;
 * - **pedido pendente** — ninguém age até o administrador decidir.
 *
 * Um componente só para as duas entidades porque a regra é a mesma; o que muda
 * é o texto.
 */
export function ExclusaoControl({ entidade, registroId, rotulo, cascata, onExcluido }: Props) {
  const { data: member } = useCurrentMember();
  const { data: solicitacoes } = useSolicitacoesExclusao();
  const [pedirAberto, { open: abrirPedido, close: fecharPedido }] = useDisclosure(false);
  const [motivo, setMotivo] = useState("");

  const solicitar = useSolicitarExclusao();
  const isAdmin = member?.role === "admin";

  const pendente = (solicitacoes ?? []).find(
    (s) => s.registroId === registroId && s.status === "pendente",
  );

  if (pendente) {
    return (
      <DecisaoPendente
        solicitacao={pendente}
        isAdmin={isAdmin}
        cascata={cascata}
        onExcluido={onExcluido}
      />
    );
  }

  if (isAdmin) {
    return (
      <ExclusaoDireta
        entidade={entidade}
        registroId={registroId}
        rotulo={rotulo}
        cascata={cascata}
        onExcluido={onExcluido}
      />
    );
  }

  return (
    <>
      <Button
        variant="subtle"
        color="red"
        leftSection={<IconTrash size={16} />}
        onClick={abrirPedido}
      >
        Solicitar exclusão
      </Button>

      <Modal
        opened={pedirAberto}
        onClose={fecharPedido}
        title={<Title order={4}>Solicitar exclusão</Title>}
      >
        <Stack>
          <Text size="sm">
            Excluir «{rotulo}» precisa de aprovação de um administrador.
            {cascata && ` ${cascata}`}
          </Text>
          <Textarea
            label="Por que excluir?"
            placeholder="Cadastro duplicado, criado por engano…"
            minRows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={fecharPedido}>
              Cancelar
            </Button>
            <Button
              color="red"
              loading={solicitar.isPending}
              onClick={() =>
                solicitar.mutate(
                  {
                    entidade,
                    registroId,
                    rotulo,
                    motivo: motivo.trim() === "" ? null : motivo.trim(),
                  },
                  {
                    onSuccess: () => {
                      setMotivo("");
                      fecharPedido();
                    },
                  },
                )
              }
            >
              Enviar pedido
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function ExclusaoDireta({ entidade, registroId, rotulo, cascata, onExcluido }: Props) {
  const excluir = useExcluirDireto();

  return (
    <AdminDeleteButton
      loading={excluir.isPending}
      label={`Excluir ${ENTIDADE_LABELS[entidade]}`}
      confirmText={`«${rotulo}» some para sempre.${cascata ? ` ${cascata}` : ""} Não dá para desfazer — o que resta é a linha no log de auditoria.`}
      onConfirm={() => excluir.mutate({ entidade, id: registroId }, { onSuccess: onExcluido })}
    />
  );
}

function DecisaoPendente({
  solicitacao,
  isAdmin,
  cascata,
  onExcluido,
}: {
  solicitacao: SolicitacaoExclusao;
  isAdmin: boolean;
  cascata?: string;
  onExcluido?: () => void;
}) {
  const { data: membros } = useTeamMembers();
  const aprovar = useAprovarExclusao();
  const recusar = useRecusarExclusao();
  const [observacao, setObservacao] = useState("");

  const quem = membros?.find((m) => m.id === solicitacao.solicitadoPor)?.fullName ?? "Alguém";
  const { color } = SOLICITACAO_STATUS_LABELS.pendente;

  return (
    <Alert
      color={color}
      variant="light"
      icon={<IconAlertTriangle size={18} />}
      title="Exclusão solicitada"
    >
      <Stack gap="xs">
        <Text size="sm">
          {quem} pediu a exclusão em {dayjs(solicitacao.createdAt).format("DD/MM/YYYY [às] HH:mm")}.
        </Text>
        {solicitacao.motivo && (
          <Text size="sm" fs="italic">
            “{solicitacao.motivo}”
          </Text>
        )}

        {isAdmin ? (
          <>
            {cascata && (
              <Text size="sm" fw={500}>
                {cascata}
              </Text>
            )}
            <Textarea
              label="Observação (opcional)"
              placeholder="Motivo de recusar, se for o caso"
              minRows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.currentTarget.value)}
            />
            <Group gap="xs">
              <Button
                color="red"
                size="compact-sm"
                loading={aprovar.isPending}
                onClick={() => aprovar.mutate(solicitacao, { onSuccess: onExcluido })}
              >
                Aprovar e excluir
              </Button>
              <Button
                variant="default"
                size="compact-sm"
                loading={recusar.isPending}
                onClick={() =>
                  recusar.mutate({
                    id: solicitacao.id,
                    observacao: observacao.trim() === "" ? null : observacao.trim(),
                  })
                }
              >
                Recusar
              </Button>
            </Group>
          </>
        ) : (
          <Badge color={color} variant="light">
            Aguardando decisão do administrador
          </Badge>
        )}
      </Stack>
    </Alert>
  );
}
