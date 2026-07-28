"use client";

import { useRouter } from "next/navigation";
import { Alert, Button, Modal, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconUserCheck } from "@tabler/icons-react";
import { useClientes, useCreateCliente } from "@/hooks/useClientes";
import { useTiposServico } from "@/hooks/useServicos";
import { useTeamMembers } from "@/hooks/useCurrentMember";
import { useAddActivity } from "@/hooks/useActivities";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { registrarNotificacao } from "@/lib/supabase/queries/jornada";
import { clienteDoLead, leadToClienteDraft } from "@/lib/conversao";
import { nomeCliente } from "@/types/cliente";
import type { Lead } from "@/types/lead";

/**
 * Converte um lead ganho em cliente. Se já foi convertido, vira um link para o
 * cliente — o vínculo é `clientes.lead_id`, que é unique, então o banco também
 * recusaria uma segunda conversão.
 */
export function ConverterLeadButton({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const { data: clientes } = useClientes();
  const createCliente = useCreateCliente();
  const { data: tipos } = useTiposServico();
  const { data: membros } = useTeamMembers();
  const registrarConversao = useAddActivity({ leadId: lead.id });

  const jaConvertido = clientes ? clienteDoLead(clientes, lead.id) : undefined;

  if (jaConvertido) {
    return (
      <Button
        variant="light"
        color="green"
        leftSection={<IconUserCheck size={16} />}
        onClick={() => router.push(`/clientes/${jaConvertido.id}`)}
      >
        Abrir cliente
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        color="green"
        leftSection={<IconUserCheck size={16} />}
        onClick={open}
      >
        Converter em cliente
      </Button>

      <Modal
        opened={opened}
        onClose={close}
        title={<Title order={3}>Converter em cliente</Title>}
        size="lg"
      >
        {lead.pipelineStage !== "fechado_ganho" && (
          <Alert color="yellow" mb="md">
            Este lead ainda não está em &quot;Fechado (Ganho)&quot;. Você pode converter mesmo
            assim, mas normalmente a conversão acontece depois do negócio fechado.
          </Alert>
        )}

        <Text size="sm" c="dimmed" mb="md">
          Os dados do lead já vêm preenchidos. Complete o que faltar — o lead continua no histórico
          do funil e fica ligado a este cliente.
        </Text>

        <ClienteForm
          draft={leadToClienteDraft(lead)}
          tipos={tipos ?? []}
          membros={membros ?? []}
          submitting={createCliente.isPending}
          submitLabel="Converter"
          onSubmit={(input) =>
            createCliente.mutate(input, {
              onSuccess: (cliente) => {
                registrarConversao.mutate({
                  activityType: "converted",
                  body: `Convertido em cliente: ${nomeCliente(cliente)}`,
                  metadata: { cliente_id: cliente.id },
                });
                // Avisa a administração do fechamento. Best-effort de proposito:
                // a conversao ja aconteceu, e falhar o aviso nao pode desfaze-la.
                void registrarNotificacao(
                  "fechamento",
                  `Novo cliente fechado: ${nomeCliente(cliente)}`,
                  `O lead "${lead.name}" foi convertido em cliente.`,
                ).catch(() => {});
                close();
                router.push(`/clientes/${cliente.id}`);
              },
            })
          }
        />
      </Modal>
    </>
  );
}
