"use client";

import { useState } from "react";
import { Button, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { IconClock } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { useUpdateLeadFollowUp } from "@/hooks/useUpdateLead";
import { getErrorMessage } from "@/lib/errors";
import type { Lead } from "@/types/lead";

/** Agenda, atualiza ou conclui o próximo retorno de um lead. */
export function FollowUpScheduler({ lead }: { lead: Lead }) {
  // Mantine v9 date inputs trabalham com strings (DateTimeStringValue), não Date.
  // Guardar Date fazia o horário se perder ao salvar (virava meia-noite).
  const [followUpAt, setFollowUpAt] = useState<string | null>(
    lead.followUpAt ? dayjs(lead.followUpAt).format("YYYY-MM-DD HH:mm:ss") : null,
  );
  const [followUpNote, setFollowUpNote] = useState(lead.followUpNote ?? "");
  const updateFollowUp = useUpdateLeadFollowUp();

  function handleSave() {
    if (!followUpAt) {
      notifications.show({ color: "red", message: "Escolha a data e hora do retorno." });
      return;
    }
    updateFollowUp.mutate(
      {
        leadId: lead.id,
        // followUpAt é hora local ("YYYY-MM-DD HH:mm:ss"); guardamos em ISO/UTC.
        followUpAt: dayjs(followUpAt).toISOString(),
        followUpNote: followUpNote.trim() || null,
      },
      {
        onSuccess: () =>
          notifications.show({
            color: "green",
            message: `Retorno agendado para ${dayjs(followUpAt).format("DD/MM/YYYY HH:mm")}.`,
          }),
        onError: (err) =>
          notifications.show({ color: "red", message: getErrorMessage(err, "Erro ao agendar.") }),
      },
    );
  }

  function handleClear() {
    updateFollowUp.mutate(
      { leadId: lead.id, followUpAt: null, followUpNote: null },
      {
        onSuccess: () => {
          setFollowUpAt(null);
          setFollowUpNote("");
          notifications.show({ color: "gray", message: "Retorno concluído." });
        },
        onError: (err) =>
          notifications.show({ color: "red", message: getErrorMessage(err, "Erro ao concluir.") }),
      },
    );
  }

  return (
    <Paper withBorder p="sm" radius="md">
      <Group gap={6} mb={6}>
        <IconClock size={15} />
        <Text size="xs" c="dimmed">
          Retornar em (follow-up)
        </Text>
      </Group>
      <Stack gap="xs">
        <DateTimePicker
          value={followUpAt}
          onChange={setFollowUpAt}
          valueFormat="DD/MM/YYYY HH:mm"
          placeholder="Escolha data e hora"
          // Ao escolher só a data, assume a hora atual em vez de meia-noite.
          defaultTimeValue={dayjs().format("HH:mm")}
          clearable
        />
        <TextInput
          placeholder="Motivo / o que combinou (opcional)"
          value={followUpNote}
          onChange={(e) => setFollowUpNote(e.currentTarget.value)}
        />
        <Group>
          <Button size="sm" onClick={handleSave} loading={updateFollowUp.isPending}>
            {lead.followUpAt ? "Atualizar retorno" : "Agendar retorno"}
          </Button>
          {lead.followUpAt && (
            <Button
              size="sm"
              variant="subtle"
              color="gray"
              onClick={handleClear}
              loading={updateFollowUp.isPending}
            >
              Concluir / remover
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}
