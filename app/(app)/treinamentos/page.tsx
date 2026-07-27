"use client";

import { useMemo, useState } from "react";
import { Button, Group, Loader, Modal, Select, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useClientes } from "@/hooks/useClientes";
import {
  useCreateTreinamento,
  useDeleteTreinamento,
  useTiposTreinamento,
  useTreinamentos,
  useUpdateTreinamento,
} from "@/hooks/useTreinamentos";
import { TreinamentosTable } from "@/components/treinamentos/TreinamentosTable";
import { TreinamentoForm } from "@/components/treinamentos/TreinamentoForm";
import { SearchInput } from "@/components/shared/SearchInput";
import { AdminDeleteButton } from "@/components/shared/AdminDeleteButton";
import { matchesQuery } from "@/lib/search";
import { VENCIMENTO_BUCKETS, vencimentoBucket } from "@/lib/vencimentos";
import { nomeCliente } from "@/types/cliente";
import type { Treinamento } from "@/types/treinamento";

export default function TreinamentosPage() {
  const { data: treinamentos, isLoading, error } = useTreinamentos();
  const { data: clientes } = useClientes();
  const { data: tipos } = useTiposTreinamento();
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<string | null>(null);
  const [novoOpened, { open: abrirNovo, close: fecharNovo }] = useDisclosure(false);
  const [emEdicao, setEmEdicao] = useState<Treinamento | null>(null);
  const create = useCreateTreinamento();
  const update = useUpdateTreinamento();
  const remove = useDeleteTreinamento();

  const filtrados = useMemo(() => {
    if (!treinamentos) return [];
    const nomePorId = new Map((clientes ?? []).map((c) => [c.id, nomeCliente(c)]));
    return treinamentos.filter((t) => {
      if (bucket) {
        if (!t.dataVencimento) return false;
        if (vencimentoBucket(t.dataVencimento) !== bucket) return false;
      }
      return matchesQuery([t.tipoNome, nomePorId.get(t.clienteId), t.instrutor, t.observacoes], search);
    });
  }, [treinamentos, clientes, search, bucket]);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Treinamentos</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={abrirNovo}>
          Novo treinamento
        </Button>
      </Group>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar treinamentos.</Text>}

      {treinamentos && (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por treinamento, cliente, instrutor..."
          />
          <Select
            label="Vencimento"
            placeholder="Todos"
            clearable
            data={VENCIMENTO_BUCKETS.map((b) => ({ value: b.value, label: b.label }))}
            value={bucket}
            onChange={setBucket}
            style={{ maxWidth: 260 }}
          />
          <TreinamentosTable
            treinamentos={filtrados}
            clientes={clientes ?? []}
            onRowClick={setEmEdicao}
          />
        </>
      )}

      <Modal
        opened={novoOpened}
        onClose={fecharNovo}
        title={<Title order={3}>Novo treinamento</Title>}
        size="lg"
      >
        <TreinamentoForm
          clientes={clientes ?? []}
          tipos={tipos ?? []}
          submitting={create.isPending}
          submitLabel="Registrar"
          onSubmit={(input) => create.mutate(input, { onSuccess: fecharNovo })}
        />
      </Modal>

      <Modal
        opened={emEdicao !== null}
        onClose={() => setEmEdicao(null)}
        title={<Title order={3}>Editar treinamento</Title>}
        size="lg"
      >
        {emEdicao && (
          <>
            <TreinamentoForm
              key={emEdicao.id}
              treinamento={emEdicao}
              clientes={clientes ?? []}
              tipos={tipos ?? []}
              submitting={update.isPending}
              submitLabel="Salvar alterações"
              onSubmit={(patch) =>
                update.mutate({ id: emEdicao.id, patch }, { onSuccess: () => setEmEdicao(null) })
              }
            />
            <Group mt="md">
              <AdminDeleteButton
                loading={remove.isPending}
                label="Excluir treinamento"
                confirmText="O registro sai do histórico do cliente e do controle de vencimentos. Não pode ser desfeito."
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
