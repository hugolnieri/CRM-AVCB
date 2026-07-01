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
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DateInput } from "@mantine/dates";
import { IconMapPin, IconPhone, IconCopy, IconCheck, IconFlame } from "@tabler/icons-react";
import { parseLogradouro, stripStreetTypePrefix, BOMBEIROS_AVCB_URL } from "@/lib/address";
import { inferAvcbStatus } from "@/lib/bombeiros";
import type { BombeirosConsulta, LicencaBombeiros } from "@/types/bombeiros";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { WhatsAppButton } from "@/components/leads/WhatsAppButton";
import { ReceitaLookup } from "@/components/leads/ReceitaLookup";
import { EditableAddress } from "@/components/leads/EditableAddress";
import { ActivityTimeline } from "@/components/leads/ActivityTimeline";
import { useActivities, useAddActivity } from "@/hooks/useActivities";
import { useUpdateLeadAvcb } from "@/hooks/useUpdateLead";
import { updateLeadBombeiros } from "@/lib/supabase/queries/leads";
import { AVCB_STATUSES } from "@/lib/pipeline/avcbStatus";
import { LICENCA_TIPOS, normalizeTipoLicenca } from "@/lib/pipeline/licencaTipo";
import { PIPELINE_STAGE_LABELS } from "@/lib/pipeline/stages";
import { getErrorMessage } from "@/lib/errors";
import type { EnderecoDetalhado, Lead } from "@/types/lead";

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
  const [tipoLicenca, setTipoLicenca] = useState<string | null>(lead.tipoLicenca);
  const [avcbStatus, setAvcbStatus] = useState<string | null>(lead.avcbStatus);
  const [avcbValidade, setAvcbValidade] = useState<Date | null>(
    lead.avcbValidade ? dayjs(lead.avcbValidade).toDate() : null,
  );
  const [noteBody, setNoteBody] = useState("");

  const { data: activities, isLoading: loadingActivities } = useActivities(lead.id);
  const updateAvcb = useUpdateLeadAvcb();
  const addNote = useAddActivity(lead.id);

  function handleSaveAvcb() {
    updateAvcb.mutate(
      {
        leadId: lead.id,
        tipoLicenca: tipoLicenca as Lead["tipoLicenca"],
        avcbStatus: avcbStatus as Lead["avcbStatus"],
        avcbValidade: avcbValidade ? dayjs(avcbValidade).format("YYYY-MM-DD") : null,
      },
      {
        onSuccess: () =>
          notifications.show({ color: "green", message: "Licença atualizada." }),
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

      {lead.phoneRaw && <CopyableField label="Telefone" value={lead.phoneRaw} />}

      <Divider label="Endereço" labelPosition="left" />

      <AddressRow label="Da importação (Google Maps)" value={lead.address} />

      <EditableAddress
        leadId={lead.id}
        initial={lead.enderecoDetalhado}
        importedAddress={lead.address}
        lat={lead.lat}
        lng={lead.lng}
      />

      <Divider label="Licença (AVCB / CLCB)" labelPosition="left" />

      <Group align="flex-end">
        <Select
          label="Tipo"
          data={LICENCA_TIPOS.map((t) => ({ value: t.value, label: t.label }))}
          value={tipoLicenca}
          onChange={setTipoLicenca}
          w={110}
        />
        <Select
          label="Status"
          data={AVCB_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          value={avcbStatus}
          onChange={setAvcbStatus}
        />
        <DateInput
          label="Validade (opcional)"
          placeholder="Confirmar com o cliente"
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
        leadId={lead.id}
        address={lead.address}
        endereco={lead.enderecoDetalhado}
        lat={lead.lat}
        lng={lead.lng}
        initialConsulta={lead.bombeirosConsulta}
        onApplyResult={(status, tipo) => {
          setAvcbStatus(status);
          setTipoLicenca(tipo);
          // Salva imediatamente com os valores da API — sem precisar clicar em "Salvar".
          updateAvcb.mutate(
            {
              leadId: lead.id,
              tipoLicenca: tipo as Lead["tipoLicenca"],
              avcbStatus: status as Lead["avcbStatus"],
              avcbValidade: avcbValidade ? dayjs(avcbValidade).format("YYYY-MM-DD") : null,
            },
            {
              onSuccess: () =>
                notifications.show({ color: "green", message: "Licença atualizada automaticamente." }),
              onError: (err) =>
                notifications.show({
                  color: "red",
                  message: getErrorMessage(err, "Erro ao salvar."),
                }),
            },
          );
        }}
      />

      <Divider label="Dados da Receita (CNPJ)" labelPosition="left" />

      <ReceitaLookup leadId={lead.id} initialCnpj={lead.cnpj} initialData={lead.receitaData} />

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
  leadId,
  address,
  endereco,
  lat,
  lng,
  initialConsulta,
  onApplyResult,
}: {
  leadId: string;
  address: string | null;
  endereco: EnderecoDetalhado | null;
  lat: number | null;
  lng: number | null;
  initialConsulta: BombeirosConsulta | null;
  onApplyResult: (status: string, tipo: string) => void;
}) {
  const queryClient = useQueryClient();
  // Prefer the manually-edited detailed address; fall back to the imported one.
  // The Bombeiros search needs the logradouro WITHOUT its "Avenida/Rua" prefix,
  // so strip it from the edited value too (the imported one is already stripped).
  const fallback = parseLogradouro(address);
  const logradouro = endereco?.logradouro?.trim()
    ? stripStreetTypePrefix(endereco.logradouro.trim())
    : fallback.logradouro;
  const numero = endereco?.numero?.trim() || fallback.numero;
  const cidadeSalva = endereco?.cidade?.trim() || null;
  const [municipio, setMunicipio] = useState<string | null>(cidadeSalva);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiLicencas, setApiLicencas] = useState<LicencaBombeiros[] | null>(
    initialConsulta?.licencas ?? null,
  );
  const [consultadoEm, setConsultadoEm] = useState<string | null>(
    initialConsulta?.consultadoEm ?? null,
  );
  const [apiError, setApiError] = useState<string | null>(null);

  // Pré-checagem: antes de gastar na API, o usuário revisa/edita os termos exatos.
  const [confirming, setConfirming] = useState(false);
  const [searchLogradouro, setSearchLogradouro] = useState("");
  const [searchNumero, setSearchNumero] = useState("");
  const [searchMunicipio, setSearchMunicipio] = useState("");

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

  // Passo 1: abre a pré-checagem com os termos preenchidos (sem gastar nada).
  async function handleOpenCheck() {
    const muni = await fetchMunicipio();
    setSearchLogradouro(logradouro);
    setSearchNumero(numero);
    setSearchMunicipio(muni ?? "");
    setConfirming(true);
  }

  // Passo 2: consulta paga com os termos revisados/editados pelo usuário.
  async function handleConfirmSearch() {
    if (!searchLogradouro.trim() || !searchMunicipio.trim()) {
      notifications.show({
        color: "red",
        message: "Informe ao menos o logradouro e a cidade.",
      });
      return;
    }
    setConfirming(false);
    setApiLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/bombeiros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          municipio: searchMunicipio.trim(),
          endereco: searchLogradouro.trim(),
          numero: searchNumero.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setApiError(data.error ?? "Não foi possível consultar.");
        setApiLicencas(null);
        return;
      }
      const licencas = data.licencas as LicencaBombeiros[];
      const agora = new Date().toISOString();
      setApiLicencas(licencas);
      setConsultadoEm(agora);

      // Persiste a consulta no lead para ficar salva ao reabrir.
      try {
        await updateLeadBombeiros(leadId, { licencas, consultadoEm: agora });
        queryClient.invalidateQueries({ queryKey: ["leads"] });
      } catch {
        // se falhar ao salvar, o resultado ainda aparece nesta sessão
      }
    } catch (err) {
      setApiError(getErrorMessage(err, "Não foi possível consultar."));
      setApiLicencas(null);
    } finally {
      setApiLoading(false);
    }
  }

  function handleApplyLicenca(licenca: LicencaBombeiros) {
    onApplyResult(inferAvcbStatus(licenca.situacao), normalizeTipoLicenca(licenca.tipoLicenca));
    notifications.show({
      color: "blue",
      message: `Tipo (${licenca.tipoLicenca}) e status sugeridos a partir de "${licenca.situacao}". Confira e clique em Salvar.`,
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

      {!confirming ? (
        <Button
          variant="light"
          color="grape"
          leftSection={<IconFlame size={16} />}
          loading={apiLoading || loading}
          onClick={handleOpenCheck}
          fullWidth
        >
          Consultar via API (~R$ 0,20/consulta)
        </Button>
      ) : (
        <Paper withBorder p="sm" radius="md">
          <Text size="sm" fw={500} mb={4}>
            Confira antes de consultar
          </Text>
          <Text size="xs" c="dimmed" mb="sm">
            Revise os termos (a grafia da rua precisa bater com o cadastro dos Bombeiros). Deixe o
            número em branco para buscar a rua inteira. Só é cobrado ao confirmar.
          </Text>
          <Stack gap="xs">
            <TextInput
              label="Logradouro (sem Rua/Av.)"
              value={searchLogradouro}
              onChange={(e) => setSearchLogradouro(e.currentTarget.value)}
            />
            <Group grow>
              <TextInput
                label="Número (opcional)"
                value={searchNumero}
                onChange={(e) => setSearchNumero(e.currentTarget.value)}
              />
              <TextInput
                label="Cidade"
                value={searchMunicipio}
                onChange={(e) => setSearchMunicipio(e.currentTarget.value)}
              />
            </Group>
            <Group>
              <Button color="grape" loading={apiLoading} onClick={handleConfirmSearch}>
                Confirmar consulta (R$ 0,20)
              </Button>
              <Button variant="subtle" color="gray" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {apiError && (
        <Text size="sm" c="red">
          {apiError}
        </Text>
      )}

      {apiLicencas && apiLicencas.length === 0 && (
        <Text size="sm" c="dimmed">
          Nenhuma licença encontrada. Verifique a grafia da rua (deve bater com o cadastro oficial)
          ou tente de novo deixando o número em branco (busca a rua inteira).
        </Text>
      )}

      {apiLicencas && apiLicencas.length > 0 && (
        <Stack gap="xs">
          {consultadoEm && (
            <Text size="xs" c="dimmed">
              Consulta salva de {dayjs(consultadoEm).format("DD/MM/YYYY HH:mm")}
            </Text>
          )}
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
