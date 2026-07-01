"use client";

import { useState } from "react";
import {
  ActionIcon,
  Button,
  CopyButton,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { IconCheck, IconCopy, IconDeviceFloppy, IconMapPin } from "@tabler/icons-react";
import { parseLogradouro } from "@/lib/address";
import { updateLeadEndereco } from "@/lib/supabase/queries/leads";
import { getErrorMessage } from "@/lib/errors";
import type { EnderecoDetalhado } from "@/types/lead";

type Fields = Record<keyof EnderecoDetalhado, string>;

const FIELD_LABELS: { key: keyof EnderecoDetalhado; label: string }[] = [
  { key: "logradouro", label: "Logradouro" },
  { key: "numero", label: "Número" },
  { key: "bairro", label: "Bairro" },
  { key: "cidade", label: "Cidade" },
  { key: "uf", label: "Estado" },
  { key: "cep", label: "CEP" },
];

const EMPTY: Fields = { logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "" };

function fromSaved(initial: EnderecoDetalhado | null): Fields {
  if (!initial) return EMPTY;
  return {
    logradouro: initial.logradouro ?? "",
    numero: initial.numero ?? "",
    bairro: initial.bairro ?? "",
    cidade: initial.cidade ?? "",
    uf: initial.uf ?? "",
    cep: initial.cep ?? "",
  };
}

interface Props {
  leadId: string;
  initial: EnderecoDetalhado | null;
  importedAddress: string | null;
  lat: number | null;
  lng: number | null;
}

export function EditableAddress({ leadId, initial, importedAddress, lat, lng }: Props) {
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<Fields>(fromSaved(initial));
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  // True quando o logradouro veio do mapa aberto (OSM) e não da importação do
  // Google Maps — nesses casos a grafia pode divergir do cadastro dos Bombeiros.
  const [logradouroNaoConfirmado, setLogradouroNaoConfirmado] = useState(false);

  function setField(key: keyof Fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    if (key === "logradouro") setLogradouroNaoConfirmado(false);
  }

  async function handleFetch() {
    if (lat == null || lng == null) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível buscar o endereço.");

      // Preferimos o NOME DA RUA da importação do Google Maps: a grafia dele
      // costuma bater com o cadastro do Corpo de Bombeiros, ao contrário do
      // OpenStreetMap (ex.: "João Pilon" vs "João Pillon"). Usamos o OSM só para
      // bairro/cidade/UF/CEP, e o número também vem da importação.
      const parsed = parseLogradouro(importedAddress);
      const importedStreet = importedAddress ? importedAddress.split(",")[0].trim() : "";
      const hasRealStreet = /[a-zA-ZÀ-ÿ]{3,}/.test(importedStreet);
      setFields({
        logradouro: hasRealStreet ? importedStreet : data.logradouro ?? "",
        numero: parsed.numero || data.numero || "",
        bairro: data.bairro ?? "",
        cidade: data.cidade ?? "",
        uf: data.uf ?? "",
        cep: data.cep ?? "",
      });
      setLogradouroNaoConfirmado(!hasRealStreet);
      notifications.show({
        color: hasRealStreet ? "blue" : "yellow",
        message: hasRealStreet
          ? "Endereço preenchido. Ajuste o que precisar e clique em Salvar."
          : "Endereço preenchido pelo mapa aberto — confira a grafia do logradouro antes de consultar.",
      });
    } catch (err) {
      notifications.show({
        color: "red",
        message: getErrorMessage(err, "Não foi possível buscar o endereço."),
      });
    } finally {
      setFetching(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: EnderecoDetalhado = {
        logradouro: fields.logradouro.trim() || null,
        numero: fields.numero.trim() || null,
        bairro: fields.bairro.trim() || null,
        cidade: fields.cidade.trim() || null,
        uf: fields.uf.trim() || null,
        cep: fields.cep.trim() || null,
      };
      await updateLeadEndereco(leadId, payload);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      notifications.show({ color: "green", message: "Endereço salvo." });
    } catch (err) {
      notifications.show({
        color: "red",
        message: getErrorMessage(err, "Não foi possível salvar o endereço."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          Endereço detalhado (editável)
        </Text>
        {lat != null && lng != null && (
          <Button
            size="compact-xs"
            variant="light"
            leftSection={<IconMapPin size={14} />}
            loading={fetching}
            onClick={handleFetch}
          >
            Preencher automaticamente (CEP)
          </Button>
        )}
      </Group>

      {FIELD_LABELS.map(({ key, label }) => (
        <div key={key}>
          <Group align="flex-end" gap="xs" wrap="nowrap">
            <TextInput
              label={label}
              value={fields[key]}
              onChange={(e) => setField(key, e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <CopyButton value={fields[key]} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copiado!" : "Copiar"} withArrow>
                  <ActionIcon
                    variant="light"
                    size="lg"
                    color={copied ? "teal" : "gray"}
                    onClick={copy}
                    disabled={!fields[key]}
                    aria-label={`Copiar ${label}`}
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
          {key === "logradouro" && logradouroNaoConfirmado && (
            <Text size="xs" c="yellow.7" mt={4}>
              ⚠ Grafia não confirmada (preenchida pelo mapa aberto). Confira o nome da rua antes de
              consultar os Bombeiros — pode diferir do cadastro oficial.
            </Text>
          )}
        </div>
      ))}

      <Button
        leftSection={<IconDeviceFloppy size={16} />}
        loading={saving}
        onClick={handleSave}
        style={{ alignSelf: "flex-start" }}
      >
        Salvar endereço
      </Button>
    </Stack>
  );
}
