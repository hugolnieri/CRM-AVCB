"use client";

import { Button, Group, Popover, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";

/**
 * Exclusão com confirmação, visível só para admin. Esconder o botão é
 * conveniência: as policies de DELETE já exigem is_admin(), então um colaborador
 * que chamasse a API direto receberia zero linhas afetadas.
 */
export function AdminDeleteButton({
  onConfirm,
  loading,
  label = "Excluir",
  confirmText = "Esta ação não pode ser desfeita.",
}: {
  onConfirm: () => void;
  loading?: boolean;
  label?: string;
  confirmText?: string;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const { data: member } = useCurrentMember();

  if (member?.role !== "admin") return null;

  return (
    <Popover opened={opened} onChange={close} withArrow position="top" width={280}>
      <Popover.Target>
        <Button
          variant="subtle"
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={open}
          loading={loading}
        >
          {label}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="sm">{confirmText}</Text>
          <Group justify="flex-end" gap="xs">
            <Button size="compact-sm" variant="subtle" color="gray" onClick={close}>
              Cancelar
            </Button>
            <Button
              size="compact-sm"
              color="red"
              onClick={() => {
                close();
                onConfirm();
              }}
            >
              Excluir
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
