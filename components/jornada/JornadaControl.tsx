"use client";

import { useState } from "react";
import { Badge, Button, Group, Modal, Stack, Text, Textarea, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useFinalizarDia, useIniciarDia, useRegistroDeHoje } from "@/hooks/useJornada";

/**
 * Botão de iniciar/finalizar jornada, no topo do Painel.
 *
 * O fechamento pede observações porque é o que alimenta o relatório diário do
 * admin — sem esse texto o relatório mostraria só números, sem o contexto do que
 * aconteceu no dia.
 */
export function JornadaControl() {
  const { registro, isLoading } = useRegistroDeHoje();
  const [opened, { open, close }] = useDisclosure(false);
  const [observacoes, setObservacoes] = useState("");
  const iniciar = useIniciarDia();
  const finalizar = useFinalizarDia();

  if (isLoading) return null;

  const iniciado = Boolean(registro?.inicioAt);
  const finalizado = Boolean(registro?.fimAt);

  if (finalizado) {
    return (
      <Badge color="gray" variant="light" size="lg">
        Dia finalizado às {dayjs(registro?.fimAt).format("HH:mm")}
      </Badge>
    );
  }

  return (
    <>
      <Group gap="xs">
        {iniciado && (
          <Text size="sm" c="dimmed">
            Desde {dayjs(registro?.inicioAt).format("HH:mm")}
          </Text>
        )}
        {iniciado ? (
          <Button
            variant="light"
            color="gray"
            leftSection={<IconPlayerStop size={16} />}
            onClick={open}
          >
            Finalizar o dia
          </Button>
        ) : (
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            loading={iniciar.isPending}
            onClick={() => iniciar.mutate(undefined)}
          >
            Iniciar dia
          </Button>
        )}
      </Group>

      <Modal opened={opened} onClose={close} title={<Title order={3}>Finalizar o dia</Title>}>
        <Stack>
          <Text size="sm" c="dimmed">
            O que aconteceu hoje? Este texto aparece no relatório da administração.
          </Text>
          <Textarea
            placeholder="Contatos feitos, visitas, pendências para amanhã..."
            minRows={4}
            value={observacoes}
            onChange={(e) => setObservacoes(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={close}>
              Cancelar
            </Button>
            <Button
              loading={finalizar.isPending}
              onClick={() =>
                finalizar.mutate(observacoes.trim() || null, {
                  onSuccess: () => {
                    setObservacoes("");
                    close();
                  },
                })
              }
            >
              Finalizar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
