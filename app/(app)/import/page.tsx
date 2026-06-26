"use client";

import { useState } from "react";
import {
  Button,
  FileInput,
  Group,
  Stack,
  Tabs,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { IconFileUpload, IconClipboard } from "@tabler/icons-react";
import { parseGoogleScraperCsv } from "@/lib/csv/parseGoogleScraperCsv";
import { importLeads, previewImport } from "@/lib/supabase/queries/leads";
import { ImportPreviewTable } from "@/components/import/ImportPreviewTable";
import { getErrorMessage } from "@/lib/errors";
import type { ParsedLead } from "@/types/lead";

export default function ImportPage() {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState("");
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[] | null>(null);
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleFileChange(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setRawText(text);
  }

  async function handlePreview() {
    if (!rawText.trim()) {
      notifications.show({ color: "red", message: "Cole o texto ou selecione um arquivo CSV." });
      return;
    }

    setPreviewing(true);
    try {
      const leads = parseGoogleScraperCsv(rawText);
      if (leads.length === 0) {
        notifications.show({ color: "red", message: "Nenhum lead reconhecido nesse conteúdo." });
        setParsedLeads(null);
        return;
      }
      const existing = await previewImport(leads);
      setParsedLeads(leads);
      setExistingKeys(existing);
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Erro ao processar",
        message: getErrorMessage(err, "Não foi possível ler o conteúdo."),
        autoClose: false,
      });
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirm() {
    if (!parsedLeads) return;
    setImporting(true);
    try {
      const result = await importLeads(parsedLeads);
      notifications.show({
        color: "green",
        title: "Importação concluída",
        message: `${result.inserted} novo(s) lead(s) importado(s), ${result.skipped} já existiam e foram ignorados.`,
      });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setParsedLeads(null);
      setExistingKeys(new Set());
      setRawText("");
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Erro ao importar",
        message: getErrorMessage(err, "Não foi possível importar os leads."),
        autoClose: false,
      });
    } finally {
      setImporting(false);
    }
  }

  const newCount = parsedLeads
    ? parsedLeads.filter((l) => !existingKeys.has(l.placeId ?? l.mapsUrl)).length
    : 0;
  const skippedCount = parsedLeads ? parsedLeads.length - newCount : 0;

  return (
    <Stack>
      <Title order={2}>Importar leads</Title>
      <Text c="dimmed" size="sm">
        Importe o CSV exportado pela extensão Google Maps Data Scraper, por upload de arquivo ou
        colando o conteúdo diretamente.
      </Text>

      <Tabs defaultValue="upload">
        <Tabs.List>
          <Tabs.Tab value="upload" leftSection={<IconFileUpload size={16} />}>
            Upload de arquivo
          </Tabs.Tab>
          <Tabs.Tab value="paste" leftSection={<IconClipboard size={16} />}>
            Colar texto
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="upload" pt="md">
          <FileInput
            label="Arquivo CSV"
            placeholder="Selecione o arquivo exportado"
            accept=".csv,text/csv"
            onChange={handleFileChange}
          />
        </Tabs.Panel>

        <Tabs.Panel value="paste" pt="md">
          <Textarea
            label="Conteúdo colado"
            placeholder="Cole aqui o conteúdo copiado da planilha/extensão"
            minRows={8}
            value={rawText}
            onChange={(e) => setRawText(e.currentTarget.value)}
          />
        </Tabs.Panel>
      </Tabs>

      <Group>
        <Button onClick={handlePreview} loading={previewing}>
          Pré-visualizar
        </Button>
      </Group>

      {parsedLeads && (
        <Stack>
          <Text>
            <strong>{newCount}</strong> novo(s) lead(s) · <strong>{skippedCount}</strong> já
            existente(s) (serão ignorados)
          </Text>
          <ImportPreviewTable leads={parsedLeads} existingKeys={existingKeys} />
          <Group>
            <Button onClick={handleConfirm} loading={importing} disabled={newCount === 0}>
              Confirmar importação
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
