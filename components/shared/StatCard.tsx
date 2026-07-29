"use client";

import type { ReactNode } from "react";
import { Card, Group, Progress, Stack, Text } from "@mantine/core";
import type { CountItem } from "@/lib/reports";

export function StatCard({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string | number;
  color?: string;
  hint?: ReactNode;
}) {
  return (
    <Card withBorder padding="md">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={700} c={color}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Card>
  );
}

/** Lista com barra proporcional ao maior item. Usada em relatórios e painel. */
export function BreakdownCard({ title, items }: { title: string; items: CountItem[] }) {
  // max ao menos 1 para não dividir por zero quando todos os counts são 0.
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <Card withBorder padding="md">
      <Text fw={600} mb="sm">
        {title}
      </Text>
      {items.length === 0 ? (
        <Text size="sm" c="dimmed">
          Sem dados.
        </Text>
      ) : (
        <Stack gap="xs">
          {items.map((item) => (
            <div key={item.key}>
              <Group justify="space-between" gap="xs">
                <Text size="sm">{item.label}</Text>
                <Text size="sm" fw={500} c={item.color}>
                  {item.count}
                </Text>
              </Group>
              <Progress value={(item.count / max) * 100} color={item.color} size="sm" mt={2} />
            </div>
          ))}
        </Stack>
      )}
    </Card>
  );
}
