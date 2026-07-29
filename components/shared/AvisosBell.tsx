"use client";

import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Badge,
  Divider,
  Group,
  Indicator,
  Popover,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import { IconBell, IconCheck } from "@tabler/icons-react";
import { useAvisos } from "@/hooks/useAvisos";
import { AVISO_REGRAS, contarNaoVistos, type Aviso } from "@/lib/avisos";

/**
 * Sino de avisos, fixo no cabeçalho ao lado do alternador de tema.
 *
 * O que cada perfil recebe é decidido em `lib/avisos.ts` — aqui só se desenha.
 *
 * As não lidas ficam em `localStorage`, e não no banco: o sino é conveniência
 * por dispositivo, não estado do domínio. A alternativa seria uma coluna em
 * `team_members`, que hoje tem `GRANT UPDATE (full_name)` e só — mexer nesse
 * grant para um contador de sino é abrir a trava contra auto-promoção pelo
 * motivo mais frágil possível.
 */
export function AvisosBell() {
  const router = useRouter();
  const avisos = useAvisos();
  const [opened, { toggle, close }] = useDisclosure(false);

  const [vistos, setVistos] = useLocalStorage<string[]>({
    key: "seico-avisos-vistos",
    defaultValue: [],
    getInitialValueInEffect: true,
  });

  const naoVistos = contarNaoVistos(avisos, vistos);

  function abrir() {
    // Marcar ao abrir: o contador serve para dizer "chegou coisa nova", e a
    // pessoa acabou de olhar. Ids determinísticos garantem que um problema já
    // conhecido não volte a acender sozinho.
    if (!opened) setVistos(avisos.map((a) => a.id));
    toggle();
  }

  function ir(aviso: Aviso) {
    close();
    if (aviso.href) router.push(aviso.href);
  }

  return (
    <Popover opened={opened} onChange={close} position="bottom-end" width={360} withArrow shadow="md">
      <Popover.Target>
        <Indicator
          label={naoVistos > 9 ? "9+" : naoVistos}
          size={16}
          disabled={naoVistos === 0}
          color="red"
          offset={6}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={abrir}
            aria-label={
              naoVistos > 0 ? `Avisos, ${naoVistos} não lidos` : "Avisos"
            }
          >
            <IconBell size={18} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <Group justify="space-between" px="sm" py="xs">
          <Text fw={600} size="sm">
            Avisos
          </Text>
          {avisos.length > 0 && (
            <Text size="xs" c="dimmed">
              {avisos.length} {avisos.length === 1 ? "item" : "itens"}
            </Text>
          )}
        </Group>
        <Divider />

        {avisos.length === 0 ? (
          <Group gap="xs" px="sm" py="lg" justify="center">
            <IconCheck size={16} color="var(--mantine-color-green-6)" />
            <Text size="sm" c="dimmed">
              Nada pendente para você.
            </Text>
          </Group>
        ) : (
          <ScrollArea.Autosize mah={380}>
            <Stack gap={0}>
              {avisos.map((aviso) => {
                const regra = AVISO_REGRAS[aviso.tipo];
                return (
                  <UnstyledButton
                    key={aviso.id}
                    onClick={() => ir(aviso)}
                    px="sm"
                    py="xs"
                    style={{
                      borderLeft: `3px solid var(--mantine-color-${regra.color}-6)`,
                      cursor: aviso.href ? "pointer" : "default",
                    }}
                  >
                    <Badge color={regra.color} variant="light" size="xs" mb={2}>
                      {regra.label}
                    </Badge>
                    <Text size="sm" lineClamp={2}>
                      {aviso.titulo}
                    </Text>
                  </UnstyledButton>
                );
              })}
            </Stack>
          </ScrollArea.Autosize>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
