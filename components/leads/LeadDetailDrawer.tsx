"use client";

import { useState } from "react";
import {
  Anchor,
  Button,
  CopyButton,
  Divider,
  Drawer,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DateInput } from "@mantine/dates";
import { IconMapPin, IconPhone, IconCopy, IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { WhatsAppButton } from "@/components/leads/WhatsAppButton";
import { ActivityTimeline } from "@/components/leads/ActivityTimeline";
import { useActivities, useAddActivity } from "@/hooks/useActivities";
import { useUpdateLeadAvcb } from "@/hooks/useUpdateLead";
import { AVCB_STATUSES } from "@/lib/pipeline/avcbStatus";
import { PIPELINE_STAGE_LABELS } from "@/lib/pipeline/stages";
import { getErrorMessage } from "@/lib/errors";
import type { Lead } from "@/types/lead";

interface Props {
  lead: Lead | null;
  onClose: () => void;
}

export function LeadDetailDrawer({ lead, onClose }: Props) {
  const isMobile = useMediaQuery("(max-width: 48em)");

  return (
    <Drawer
      opened={lead !== null}
      onClose={onClose}
      title={lead ? <Title order={3}>{lead.name}</Title> : null}
      position="right"
      size={isMobile ? "100%" : "lg"}
    >
      {/* Keying by lead.id resets all local form state when a different lead is
          opened, without needing an effect to re-sync state from props. */}
      {lead && <LeadDetailContent key={lead.id} lead={lead} />}
    </Drawer>
  );
}

function LeadDetailContent({ lead }: { lead: Lead }) {
  const [avcbStatus, setAvcbStatus] = useState<string | null>(lead.avcbStatus);
  const [avcbValidade, setAvcbValidade] = useState<Date | null>(
    lead.avcbValidade ? dayjs(lead.avcbValidade).toDate() : null,
  );
  const [noteBody, setNoteBody] = useState("");
  const [fullAddress, setFullAddress] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  const { data: activities, isLoading: loadingActivities } = useActivities(lead.id);
  const updateAvcb = useUpdateLeadAvcb();
  const addNote = useAddActivity(lead.id);

  async function handleFetchFullAddress() {
    if (lead.lat == null || lead.lng == null) return;
    setLoadingAddress(true);
    try {
      const res = await fetch(`/api/geocode?lat=${lead.lat}&lng=${lead.lng}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível buscar o endereço.");
      setFullAddress(data.address as string);
    } catch (err) {
      notifications.show({
        color: "red",
        message: getErrorMessage(err, "Não foi possível buscar o endereço completo."),
      });
    } finally {
      setLoadingAddress(false);
    }
  }

  function handleSaveAvcb() {
    updateAvcb.mutate(
      {
        leadId: lead.id,
        avcbStatus: avcbStatus as Lead["avcbStatus"],
        avcbValidade: avcbValidade ? dayjs(avcbValidade).format("YYYY-MM-DD") : null,
      },
      {
        onSuccess: () =>
          notifications.show({ color: "green", message: "Status do AVCB atualizado." }),
        onError: (err) =>
          notifications.show({
            color: "red",
            message: getErrorMessage(err, "Erro ao salvar."),
          }),
      },
    );
  }

  function handleAddNote() {
    if (!noteBody.trim()) return;
    addNote.mutate(
      { activityType: "note", body: noteBody.trim() },
      {
        onSuccess: () => setNoteBody(""),
        onError: (err) =>
          notifications.show({
            color: "red",
            message: getErrorMessage(err, "Erro ao salvar nota."),
          }),
      },
    );
  }

  return (
    <Stack>
      <Group>
        <Text size="sm" c="dimmed">
          {lead.category ?? "Sem categoria"} · Etapa: {PIPELINE_STAGE_LABELS[lead.pipelineStage]}
        </Text>
      </Group>

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
        <Anchor href={lead.mapsUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" leftSection={<IconMapPin size={16} />} component="span">
            Ver no Maps
          </Button>
        </Anchor>
      </Group>

      <Divider label="Endereço" labelPosition="left" />

      <AddressRow label="Da importação (Google Maps)" value={lead.address} />

      {fullAddress && <AddressRow label="Endereço completo (com CEP)" value={fullAddress} highlight />}

      {lead.lat != null && lead.lng != null && (
        <Button
          variant="light"
          size="compact-sm"
          loading={loadingAddress}
          onClick={handleFetchFullAddress}
          leftSection={<IconMapPin size={14} />}
          style={{ alignSelf: "flex-start" }}
        >
          {fullAddress ? "Buscar novamente" : "Buscar endereço completo (CEP)"}
        </Button>
      )}

      <Divider label="AVCB" labelPosition="left" />

      <Group align="flex-end">
        <Select
          label="Status do AVCB"
          data={AVCB_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          value={avcbStatus}
          onChange={setAvcbStatus}
        />
        <DateInput
          label="Validade"
          placeholder="Selecione a data"
          value={avcbValidade}
          onChange={(value) => setAvcbValidade(value ? dayjs(value).toDate() : null)}
          valueFormat="DD/MM/YYYY"
          clearable
        />
        <Button onClick={handleSaveAvcb} loading={updateAvcb.isPending}>
          Salvar
        </Button>
      </Group>

      <Divider label="Notas e histórico" labelPosition="left" />

      <Textarea
        placeholder="Adicionar uma nota sobre este lead"
        value={noteBody}
        onChange={(e) => setNoteBody(e.currentTarget.value)}
        minRows={2}
      />
      <Group>
        <Button onClick={handleAddNote} loading={addNote.isPending} disabled={!noteBody.trim()}>
          Adicionar nota
        </Button>
      </Group>

      <ActivityTimeline activities={activities} loading={loadingActivities} />
    </Stack>
  );
}

function AddressRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | null;
  highlight?: boolean;
}) {
  if (!value) {
    return (
      <Text size="sm" c="dimmed">
        {label}: não identificado.
      </Text>
    );
  }

  return (
    <Paper withBorder p="sm" radius="md" bg={highlight ? "var(--mantine-color-teal-light)" : undefined}>
      <Text size="xs" c="dimmed" mb={4}>
        {label}
      </Text>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Text size="sm" style={{ wordBreak: "break-word" }}>
          {value}
        </Text>
        <CopyButton value={value} timeout={2000}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? "Copiado!" : "Copiar endereço"} withArrow>
              <Button
                size="compact-sm"
                variant="light"
                color={copied ? "teal" : "gray"}
                onClick={copy}
                leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              >
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
    </Paper>
  );
}
