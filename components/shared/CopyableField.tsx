"use client";

import { Button, CopyButton, Group, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";

/** Rótulo + valor com botão de copiar. Telefone, CNPJ, e-mail, endereço. */
export function CopyableField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="sm" style={{ wordBreak: "break-word" }}>
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
              style={{ flexShrink: 0 }}
            >
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}
