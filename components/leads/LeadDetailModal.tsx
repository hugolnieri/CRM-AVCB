"use client";

import { useState } from "react";
import { Button, Divider, Group, Stack, Text } from "@mantine/core";
import { IconPencil, IconPhone } from "@tabler/icons-react";
import { DetailModal } from "@/components/shared/DetailModal";
import { CopyableField } from "@/components/shared/CopyableField";
import { WhatsAppButton } from "@/components/leads/WhatsAppButton";
import { PipelineStageControl } from "@/components/leads/PipelineStageControl";
import { FollowUpScheduler } from "@/components/leads/FollowUpScheduler";
import { NoteComposer } from "@/components/leads/NoteComposer";
import { ConverterLeadButton } from "@/components/leads/ConverterLeadButton";
import { LeadForm } from "@/components/leads/LeadForm";
import { ActivityTimeline } from "@/components/leads/ActivityTimeline";
import { useActivities } from "@/hooks/useActivities";
import { useUpdateLeadInfo } from "@/hooks/useLeads";
import type { Lead } from "@/types/lead";

interface Props {
  lead: Lead | null;
  onClose: () => void;
}

export function LeadDetailModal({ lead, onClose }: Props) {
  return (
    <DetailModal record={lead} title={(l) => l.name} onClose={onClose}>
      {(l) => <LeadDetailContent lead={l} />}
    </DetailModal>
  );
}

function LeadDetailContent({ lead }: { lead: Lead }) {
  const [editing, setEditing] = useState(false);
  const { data: activities, isLoading: loadingActivities } = useActivities({ leadId: lead.id });
  const updateInfo = useUpdateLeadInfo();

  if (editing) {
    return (
      <Stack>
        <LeadForm
          lead={lead}
          submitting={updateInfo.isPending}
          submitLabel="Salvar alterações"
          onSubmit={(patch) =>
            updateInfo.mutate({ id: lead.id, patch }, { onSuccess: () => setEditing(false) })
          }
        />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack>
      {lead.interesse && (
        <Text size="sm" c="dimmed">
          {lead.interesse}
        </Text>
      )}

      <PipelineStageControl lead={lead} />

      <FollowUpScheduler lead={lead} />

      <Group>
        <WhatsAppButton phoneE164={lead.phoneE164} />
        {lead.phoneRaw && (
          <Button
            component="a"
            href={`tel:${lead.phoneE164 ?? lead.phoneRaw}`}
            variant="outline"
            leftSection={<IconPhone size={16} />}
          >
            Ligar
          </Button>
        )}
        <Button
          variant="outline"
          color="gray"
          leftSection={<IconPencil size={16} />}
          onClick={() => setEditing(true)}
        >
          Editar dados
        </Button>
        <ConverterLeadButton lead={lead} />
      </Group>

      <Divider label="Dados" labelPosition="left" />

      <Stack gap={4}>
        <CopyableField label="Contato" value={lead.contatoNome} />
        <CopyableField label="Telefone" value={lead.phoneRaw} />
        <CopyableField label="E-mail" value={lead.email} />
        <CopyableField label="CNPJ" value={lead.cnpj} />
        <CopyableField label="Endereço" value={lead.address} />
        <CopyableField
          label="Cidade"
          value={[lead.cidade, lead.uf].filter(Boolean).join(" - ") || null}
        />
        <CopyableField label="Origem" value={lead.origem} />
        {lead.valorEstimado !== null && (
          <Text size="sm">
            <Text span c="dimmed">
              Valor estimado:{" "}
            </Text>
            {lead.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </Text>
        )}
      </Stack>

      <Divider label="Notas e histórico" labelPosition="left" />

      <NoteComposer owner={{ leadId: lead.id }} placeholder="Adicionar uma nota sobre este lead" />

      <ActivityTimeline activities={activities} loading={loadingActivities} />
    </Stack>
  );
}
