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
import { IconMapPin, IconPhone, IconCopy, IconCheck, IconFlame } from "@tabler/icons-react";
import { parseLogradouro, BOMBEIROS_AVCB_URL } from "@/lib/address";
import { inferAvcbStatus } from "@/lib/bombeiros";
import type { LicencaBombeiros } from "@/types/bombeiros";
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
          fullWidth
          loading={loadingAddress}
          onClick={handleFetchFullAddress}
          leftSection={<IconMapPin size={16} />}
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

      <BombeirosLookup
        address={lead.address}
        lat={lead.lat}
        lng={lead.lng}
        onApplyStatus={(status) => setAvcbStatus(status)}
      />

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

function BombeirosLookup({
  address,
  lat,
  lng,
  onApplyStatus,
}: {
  address: string | null;
  lat: number | null;
  lng: number | null;
  onApplyStatus: (status: string) => void;
}) {
  const { logradouro, numero } = parseLogradouro(address);
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiLicencas, setApiLicencas] = useState<LicencaBombeiros[] | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  async function fetchMunicipio(): Promise<string | null> {
    if (municipio) return municipio;
    if (lat == null || lng == null) return null;
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (res.ok && data.municipio) {
        setMunicipio(data.municipio as string);
        return data.municipio as string;
      }
    } catch {
      // best-effort — o usuário ainda consegue selecionar o município no site
    } finally {
      setLoading(false);
    }
    return null;
  }

  function openBombeiros(muni: string | null) {
    // Os dados vão no fragmento (#) da URL: o # não é enviado ao servidor (não
    // interfere no postback do ASP.NET), mas o userscript de auto-preenchimento
    // consegue lê-lo na página dos Bombeiros.
    const payload = encodeURIComponent(
      JSON.stringify({ municipio: muni ?? "", logradouro, numero }),
    );
    window.open(`${BOMBEIROS_AVCB_URL}#avcb=${payload}`, "_blank", "noopener,noreferrer");
  }

  async function handleStart() {
    const muni = await fetchMunicipio();
    if (logradouro) {
      navigator.clipboard?.writeText(logradouro).catch(() => {});
    }
    setStarted(true);
    openBombeiros(muni);
  }

  async function handleConsultApi() {
    const muni = await fetchMunicipio();
    if (!muni) {
      notifications.show({
        color: "red",
        message: "Não foi possível identificar o município para essa consulta.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Essa consulta é paga (~R$ 0,20, debitado do seu saldo na Infosimples).\n\nMunicípio: ${muni}\nLogradouro: ${logradouro}\nNúmero: ${numero || "(não informado)"}\n\nConfirmar consulta?`,
    );
    if (!confirmed) return;

    setApiLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/bombeiros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipio: muni, endereco: logradouro, numero }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setApiError(data.error ?? "Não foi possível consultar.");
        setApiLicencas(null);
        return;
      }
      setApiLicencas(data.licencas as LicencaBombeiros[]);
    } catch (err) {
      setApiError(getErrorMessage(err, "Não foi possível consultar."));
      setApiLicencas(null);
    } finally {
      setApiLoading(false);
    }
  }

  function handleApplyLicenca(licenca: LicencaBombeiros) {
    onApplyStatus(inferAvcbStatus(licenca.situacao));
    notifications.show({
      color: "blue",
      message: `Status sugerido a partir de "${licenca.situacao}". Confira e clique em Salvar.`,
    });
  }

  if (!logradouro) {
    return (
      <Text size="sm" c="dimmed">
        Sem endereço suficiente para consultar nos Bombeiros.
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      <Button
        variant="light"
        color="red"
        leftSection={<IconFlame size={16} />}
        loading={loading}
        onClick={handleStart}
        fullWidth
      >
        Consultar AVCB nos Bombeiros
      </Button>

      {started && (
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed" mb="sm">
            Abriu o site dos Bombeiros em outra aba. Com o auto-preenchimento instalado, cidade, rua
            e número já vêm prontos — só resolva o código da imagem e clique em pesquisar. Sem ele,
            use os campos abaixo (o logradouro já foi copiado).
          </Text>
          <Stack gap={6}>
            <CopyableField label="Município" value={municipio ?? "não identificado"} />
            <CopyableField label="Logradouro" value={logradouro} />
            <CopyableField label="Número" value={numero || "—"} />
          </Stack>
          <Button
            variant="subtle"
            size="compact-sm"
            mt="sm"
            onClick={() => openBombeiros(municipio)}
          >
            Abrir site novamente
          </Button>
        </Paper>
      )}

      <Divider label="ou" labelPosition="center" />

      <Button
        variant="light"
        color="grape"
        leftSection={<IconFlame size={16} />}
        loading={apiLoading}
        onClick={handleConsultApi}
        fullWidth
      >
        Consultar via API (~R$ 0,20/consulta)
      </Button>

      {apiError && (
        <Text size="sm" c="red">
          {apiError}
        </Text>
      )}

      {apiLicencas && apiLicencas.length === 0 && (
        <Text size="sm" c="dimmed">
          Nenhuma licença encontrada para esse endereço.
        </Text>
      )}

      {apiLicencas && apiLicencas.length > 0 && (
        <Stack gap="xs">
          {apiLicencas.map((licenca, i) => (
            <Paper key={i} withBorder p="sm" radius="md">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text size="sm" fw={500}>
                    {licenca.tipoLicenca} — {licenca.situacao}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Nº {licenca.numeroLicenca} · {licenca.bairro} · {licenca.ocupacao}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {licenca.endereco}
                  </Text>
                </div>
                <Button size="compact-xs" variant="light" onClick={() => handleApplyLicenca(licenca)}>
                  Usar este resultado
                </Button>
              </Group>
              {licenca.siteReceipt && (
                <Anchor href={licenca.siteReceipt} target="_blank" rel="noopener noreferrer" size="xs">
                  Ver comprovante oficial
                </Anchor>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function CopyableField({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="sm">
        <Text span c="dimmed">
          {label}:{" "}
        </Text>
        {value}
      </Text>
      <CopyButton value={value} timeout={2000}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? "Copiado!" : "Copiar"} withArrow>
            <Button
              size="compact-xs"
              variant="subtle"
              color={copied ? "teal" : "gray"}
              onClick={copy}
              leftSection={copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            >
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
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
