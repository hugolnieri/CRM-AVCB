"use client";

import { useMemo } from "react";
import { Loader, Stack, Text, Title } from "@mantine/core";
import { useLeads } from "@/hooks/useLeads";
import { useClientes } from "@/hooks/useClientes";
import { useServicos, useTiposServico } from "@/hooks/useServicos";
import { useSolicitacoesExclusao } from "@/hooks/useExclusoes";
import { TarefasPanel } from "@/components/tarefas/TarefasPanel";
import { computePainel } from "@/lib/painel";

export default function TarefasPage() {
  const { data: leads, isLoading } = useLeads();
  const { data: clientes } = useClientes();
  const { data: servicos } = useServicos();
  const { data: tipos } = useTiposServico();
  const { data: solicitacoes } = useSolicitacoesExclusao();

  // As pendências vêm do mesmo computePainel que alimenta o Painel e o sino —
  // um lugar só define o que conta como pendência.
  const pendencias = useMemo(
    () =>
      computePainel({
        clientes: clientes ?? [],
        servicos: servicos ?? [],
        tipos: tipos ?? [],
        leads: leads ?? [],
        solicitacoes: solicitacoes ?? [],
      }).pendencias,
    [clientes, servicos, tipos, leads, solicitacoes],
  );

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <div>
        <Title order={2}>Tarefas</Title>
        <Text size="sm" c="dimmed">
          O que alguém digitou e o que o sistema achou sozinho, na mesma lista. As automáticas
          somem quando o dado que as gerou é corrigido.
        </Text>
      </div>

      <TarefasPanel pendencias={pendencias} />
    </Stack>
  );
}
