"use client";

import { useState } from "react";
import { Alert, Button, Divider, Group, Modal, Stack, Title } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { IconCalendarCheck, IconPlus } from "@tabler/icons-react";
import dayjs from "dayjs";
import { ServicosTable } from "@/components/servicos/ServicosTable";
import { ServicoForm } from "@/components/servicos/ServicoForm";
import { AdminDeleteButton } from "@/components/shared/AdminDeleteButton";
import {
  useConcluirServico,
  useCreateServico,
  useDeleteServico,
  useUpdateServico,
} from "@/hooks/useServicos";
import { sugerirVencimento } from "@/lib/servicos";
import type { Cliente } from "@/types/cliente";
import type { Servico, ServicoStatus, TipoServico } from "@/types/servico";
import type { TeamMember } from "@/types/team";

interface Props {
  servicos: Servico[];
  clientes: Cliente[];
  membros: TeamMember[];
  tipos: TipoServico[];
  /** Quando presente, o formulário já vem preso a este cliente. */
  clienteFixo?: string;
  /** Status inicial ao criar. A Agenda entra com "agendado". */
  statusInicial?: ServicoStatus;
  novoLabel?: string;
}

/**
 * Tabela + modais de criar/editar/concluir/excluir serviço.
 *
 * Existe como componente único porque a página /servicos e a aba do cliente
 * precisavam exatamente da mesma orquestração — antes isso vivia duplicado nos
 * dois lugares, e qualquer ajuste tinha que ser feito duas vezes.
 */
export function ServicosPanel({
  servicos,
  clientes,
  membros,
  tipos,
  clienteFixo,
  statusInicial = "realizado",
  novoLabel = "Novo serviço",
}: Props) {
  const [novoOpened, { open: abrirNovo, close: fecharNovo }] = useDisclosure(false);
  const [emEdicao, setEmEdicao] = useState<Servico | null>(null);
  const [concluindo, setConcluindo] = useState<Servico | null>(null);

  const create = useCreateServico();
  const update = useUpdateServico();
  const remove = useDeleteServico();

  return (
    <Stack>
      <Group justify="flex-end">
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNovo}>
          {novoLabel}
        </Button>
      </Group>

      <ServicosTable
        servicos={servicos}
        clientes={clientes}
        membros={membros}
        tipos={tipos}
        hideCliente={Boolean(clienteFixo)}
        onRowClick={setEmEdicao}
      />

      <Modal
        opened={novoOpened}
        onClose={fecharNovo}
        title={<Title order={3}>{novoLabel}</Title>}
        size="lg"
      >
        <ServicoForm
          clientes={clientes}
          tipos={tipos}
          membros={membros}
          clienteFixo={clienteFixo}
          statusInicial={statusInicial}
          submitting={create.isPending}
          submitLabel="Salvar"
          onSubmit={(input) => create.mutate(input, { onSuccess: fecharNovo })}
        />
      </Modal>

      <Modal
        opened={emEdicao !== null}
        onClose={() => setEmEdicao(null)}
        title={<Title order={3}>Editar serviço</Title>}
        size="lg"
      >
        {emEdicao && (
          <Stack>
            {emEdicao.status === "agendado" && (
              <Alert color="blue" icon={<IconCalendarCheck size={18} />}>
                <Group justify="space-between" wrap="wrap">
                  <span>
                    Agendado para{" "}
                    {dayjs(emEdicao.dataAgendada).format("DD/MM/YYYY [às] HH:mm")}.
                  </span>
                  <Button
                    size="compact-sm"
                    onClick={() => {
                      setConcluindo(emEdicao);
                      setEmEdicao(null);
                    }}
                  >
                    Marcar como realizado
                  </Button>
                </Group>
              </Alert>
            )}

            <ServicoForm
              key={emEdicao.id}
              servico={emEdicao}
              clientes={clientes}
              tipos={tipos}
              membros={membros}
              clienteFixo={clienteFixo}
              submitting={update.isPending}
              submitLabel="Salvar alterações"
              onSubmit={(patch) =>
                update.mutate({ id: emEdicao.id, patch }, { onSuccess: () => setEmEdicao(null) })
              }
            />

            <Divider />
            <Group>
              <AdminDeleteButton
                loading={remove.isPending}
                label="Excluir serviço"
                confirmText="O registro sai do histórico do cliente e do controle de vencimentos. Não pode ser desfeito."
                onConfirm={() => remove.mutate(emEdicao.id, { onSuccess: () => setEmEdicao(null) })}
              />
            </Group>
          </Stack>
        )}
      </Modal>

      <ConcluirModal
        servico={concluindo}
        tipos={tipos}
        onClose={() => setConcluindo(null)}
      />
    </Stack>
  );
}

/**
 * Concluir é um passo próprio, e não só trocar o status no formulário, porque é
 * onde a data de realização e o vencimento são definidos — que é o momento em
 * que o serviço passa a contar para o controle de validade.
 */
function ConcluirModal({
  servico,
  tipos,
  onClose,
}: {
  servico: Servico | null;
  tipos: TipoServico[];
  onClose: () => void;
}) {
  const concluir = useConcluirServico();
  const hoje = dayjs().format("YYYY-MM-DD");
  const [dataRealizacao, setDataRealizacao] = useState<string | null>(hoje);
  const [dataVencimento, setDataVencimento] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);

  const tipo = servico?.tipoServicoId
    ? tipos.find((t) => t.id === servico.tipoServicoId)
    : undefined;

  // Sugestão recalculada a partir da data escolhida, salvo se a pessoa mexeu.
  const vencimentoSugerido = tocado
    ? dataVencimento
    : sugerirVencimento(dataRealizacao ?? hoje, tipo?.validadeMeses ?? null);

  return (
    <Modal
      opened={servico !== null}
      onClose={onClose}
      title={<Title order={3}>Concluir serviço</Title>}
    >
      {servico && (
        <Stack key={servico.id}>
          <DateInput
            label="Data de realização"
            valueFormat="DD/MM/YYYY"
            withAsterisk
            value={dataRealizacao}
            onChange={setDataRealizacao}
          />
          <DateInput
            label="Vence em"
            placeholder={tipo?.validadeMeses ? "Sugerido pelo tipo" : "Este tipo não vence"}
            valueFormat="DD/MM/YYYY"
            clearable
            value={vencimentoSugerido}
            onChange={(value) => {
              setTocado(true);
              setDataVencimento(value);
            }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              loading={concluir.isPending}
              disabled={!dataRealizacao}
              onClick={() =>
                concluir.mutate(
                  {
                    id: servico.id,
                    dataRealizacao: dataRealizacao as string,
                    dataVencimento: vencimentoSugerido,
                  },
                  {
                    onSuccess: () => {
                      setTocado(false);
                      setDataVencimento(null);
                      setDataRealizacao(hoje);
                      onClose();
                    },
                  },
                )
              }
            >
              Concluir
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
