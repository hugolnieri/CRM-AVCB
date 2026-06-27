"use client";

import { useState } from "react";
import { Badge, Button, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { IconBuildingStore } from "@tabler/icons-react";
import { normalizeCnpj, formatCnpj } from "@/lib/cnpj";
import { updateLeadReceita } from "@/lib/supabase/queries/leads";
import { getErrorMessage } from "@/lib/errors";
import type { ReceitaData } from "@/types/receita";

interface Props {
  leadId: string;
  initialCnpj: string | null;
  initialData: ReceitaData | null;
}

export function ReceitaLookup({ leadId, initialCnpj, initialData }: Props) {
  const queryClient = useQueryClient();
  const [cnpjInput, setCnpjInput] = useState(initialCnpj ? formatCnpj(initialCnpj) : "");
  const [data, setData] = useState<ReceitaData | null>(initialData);
  const [loading, setLoading] = useState(false);

  async function handleLookup() {
    const cnpj = normalizeCnpj(cnpjInput);
    if (!cnpj) {
      notifications.show({ color: "red", message: "Informe um CNPJ válido (14 dígitos)." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cnpj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        notifications.show({ color: "red", message: json.error ?? "Não foi possível consultar." });
        return;
      }

      const receita = json.data as ReceitaData;
      setData(receita);
      await updateLeadReceita(leadId, cnpj, receita);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      notifications.show({ color: "green", message: "Dados da Receita atualizados." });
    } catch (err) {
      notifications.show({
        color: "red",
        message: getErrorMessage(err, "Não foi possível consultar a Receita."),
      });
    } finally {
      setLoading(false);
    }
  }

  const ativa = data?.situacaoCadastral?.toUpperCase() === "ATIVA";

  return (
    <Stack gap="xs">
      <Group align="flex-end" wrap="nowrap">
        <TextInput
          label="CNPJ"
          placeholder="00.000.000/0000-00"
          value={cnpjInput}
          onChange={(e) => setCnpjInput(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button
          variant="light"
          leftSection={<IconBuildingStore size={16} />}
          loading={loading}
          onClick={handleLookup}
        >
          Buscar
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        Consulta gratuita aos dados públicos da Receita Federal (via BrasilAPI). Requer o número do
        CNPJ — não há busca grátis por nome da empresa.
      </Text>

      {data && (
        <Paper withBorder p="sm" radius="md">
          <Group justify="space-between" align="flex-start">
            <Text fw={500} size="sm">
              {data.razaoSocial ?? "—"}
            </Text>
            {data.situacaoCadastral && (
              <Badge color={ativa ? "green" : "red"}>{data.situacaoCadastral}</Badge>
            )}
          </Group>
          {data.nomeFantasia && (
            <Text size="xs" c="dimmed">
              Nome fantasia: {data.nomeFantasia}
            </Text>
          )}
          {data.cnae && (
            <Text size="sm" mt={4}>
              Atividade: {data.cnae}
            </Text>
          )}
          {data.telefone && <Text size="sm">Telefone (Receita): {data.telefone}</Text>}
          {data.email && <Text size="sm">E-mail: {data.email}</Text>}
          {data.dataInicioAtividade && (
            <Text size="xs" c="dimmed" mt={4}>
              Aberta em: {data.dataInicioAtividade}
            </Text>
          )}
          {data.endereco && (
            <Text size="xs" c="dimmed">
              {data.endereco}
            </Text>
          )}
        </Paper>
      )}
    </Stack>
  );
}
