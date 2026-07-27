"use client";

import { useMemo, useState } from "react";
import { Button, Group, Loader, Modal, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useClientes } from "@/hooks/useClientes";
import {
  useCreateServico,
  useDeleteServico,
  useServicos,
  useUpdateServico,
} from "@/hooks/useServicos";
import { useTeamMembers } from "@/hooks/useCurrentMember";
import { ServicosTable } from "@/components/servicos/ServicosTable";
import { ServicoForm } from "@/components/servicos/ServicoForm";
import { SearchInput } from "@/components/shared/SearchInput";
import { AdminDeleteButton } from "@/components/shared/AdminDeleteButton";
import { matchesQuery } from "@/lib/search";
import { nomeCliente } from "@/types/cliente";
import type { Servico } from "@/types/servico";

export default function ServicosPage() {
  const { data: servicos, isLoading, error } = useServicos();
  const { data: clientes } = useClientes();
  const { data: membros } = useTeamMembers();
  const [search, setSearch] = useState("");
  const [novoOpened, { open: abrirNovo, close: fecharNovo }] = useDisclosure(false);
  const [emEdicao, setEmEdicao] = useState<Servico | null>(null);
  const create = useCreateServico();
  const update = useUpdateServico();
  const remove = useDeleteServico();

  const tiposConhecidos = useMemo(
    () => Array.from(new Set((servicos ?? []).map((s) => s.tipo))).sort(),
    [servicos],
  );

  const filtrados = useMemo(() => {
    if (!servicos) return [];
    const nomePorId = new Map((clientes ?? []).map((c) => [c.id, nomeCliente(c)]));
    return servicos.filter((s) =>
      matchesQuery([s.tipo, nomePorId.get(s.clienteId), s.observacoes], search),
    );
  }, [servicos, clientes, search]);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Serviços</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNovo}>
          Novo serviço
        </Button>
      </Group>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar serviços.</Text>}

      {servicos && (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por serviço, cliente, observação..."
          />
          <ServicosTable
            servicos={filtrados}
            clientes={clientes ?? []}
            membros={membros ?? []}
            onRowClick={setEmEdicao}
          />
        </>
      )}

      <Modal opened={novoOpened} onClose={fecharNovo} title={<Title order={3}>Novo serviço</Title>} size="lg">
        <ServicoForm
          clientes={clientes ?? []}
          membros={membros ?? []}
          tiposConhecidos={tiposConhecidos}
          submitting={create.isPending}
          submitLabel="Registrar"
          onSubmit={(input) => create.mutate(input, { onSuccess: fecharNovo })}
        />
      </Modal>

      <Modal
        opened={emEdicao !== null}
        onClose={() => setEmEdicao(null)}
        title={<Title order={3}>Editar serviço</Title>}
        size="lg"
      >
        {emEdicao && (
          <>
            <ServicoForm
              key={emEdicao.id}
              servico={emEdicao}
              clientes={clientes ?? []}
              membros={membros ?? []}
              tiposConhecidos={tiposConhecidos}
              submitting={update.isPending}
              submitLabel="Salvar alterações"
              onSubmit={(patch) =>
                update.mutate({ id: emEdicao.id, patch }, { onSuccess: () => setEmEdicao(null) })
              }
            />
            <Group mt="md">
              <AdminDeleteButton
                loading={remove.isPending}
                label="Excluir serviço"
                confirmText="O registro sai do histórico do cliente. Não pode ser desfeito."
                onConfirm={() =>
                  remove.mutate(emEdicao.id, { onSuccess: () => setEmEdicao(null) })
                }
              />
            </Group>
          </>
        )}
      </Modal>
    </Stack>
  );
}
