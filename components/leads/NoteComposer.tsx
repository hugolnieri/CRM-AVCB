"use client";

import { useState } from "react";
import { Button, Group, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useAddActivity } from "@/hooks/useActivities";
import { getErrorMessage } from "@/lib/errors";
import type { ActivityOwner } from "@/types/activity";

/** Caixa de nota livre. Serve tanto para lead quanto para cliente. */
export function NoteComposer({
  owner,
  placeholder = "Adicionar uma nota",
}: {
  owner: ActivityOwner;
  placeholder?: string;
}) {
  const [body, setBody] = useState("");
  const addNote = useAddActivity(owner);

  function handleAdd() {
    if (!body.trim()) return;
    addNote.mutate(
      { activityType: "note", body: body.trim() },
      {
        onSuccess: () => setBody(""),
        onError: (err) =>
          notifications.show({
            color: "red",
            message: getErrorMessage(err, "Erro ao salvar nota."),
          }),
      },
    );
  }

  return (
    <>
      <Textarea
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.currentTarget.value)}
        minRows={2}
      />
      <Group>
        <Button onClick={handleAdd} loading={addNote.isPending} disabled={!body.trim()}>
          Adicionar nota
        </Button>
      </Group>
    </>
  );
}
