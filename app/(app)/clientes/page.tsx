"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Group, Loader, Modal, Stack, Switch, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useClientes, useCreateCliente } from "@/hooks/useClientes";
import { useServicos, useTiposServico } from "@/hooks/useServicos";
import { useTeamMembers } from "@/hooks/useCurrentMember";
import { ClientesTable } from "@/components/clientes/ClientesTable";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { SearchInput } from "@/components/shared/SearchInput";
import { itensVenciveis } from "@/lib/vencimentos";
import { matchesQuery } from "@/lib/search";

export default function ClientesPage() {
  const router = useRouter();
  const { data: clientes, isLoading, error } = useClientes();
  const { data: servicos } = useServicos();
  const { data: tipos } = useTiposServico();
  const { data: membros } = useTeamMembers();
  const [search, setSearch] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [newOpened, { open: openNew, close: closeNew }] = useDisclosure(false);
  const createCliente = useCreateCliente();

  const itens = useMemo(
    () => itensVenciveis(servicos ?? [], clientes ?? []),
    [servicos, clientes],
  );

  const filtrados = useMemo(() => {
    if (!clientes) return [];
    return clientes.filter((c) => {
      if (!mostrarInativos && c.status === "inativo") return false;
      return matchesQuery(
        [c.razaoSocial, c.nomeFantasia, c.cnpj, c.contatoNome, c.cidade, c.telefone, c.email],
        search,
      );
    });
  }, [clientes, search, mostrarInativos]);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Clientes</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openNew}>
          Novo cliente
        </Button>
      </Group>

      {isLoading && <Loader />}
      {error && <Text c="red">Erro ao carregar clientes.</Text>}

      {clientes && (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por razão social, fantasia, CNPJ, contato, cidade..."
          />
          <Switch
            label="Mostrar clientes inativos"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.currentTarget.checked)}
          />
          <ClientesTable
            clientes={filtrados}
            itens={itens}
            onRowClick={(cliente) => router.push(`/clientes/${cliente.id}`)}
          />
        </>
      )}

      <Modal
        opened={newOpened}
        onClose={closeNew}
        title={<Title order={3}>Novo cliente</Title>}
        size="lg"
      >
        <ClienteForm
          tipos={tipos ?? []}
          membros={membros ?? []}
          submitting={createCliente.isPending}
          submitLabel="Cadastrar"
          onSubmit={(input) =>
            createCliente.mutate(input, {
              onSuccess: (cliente) => {
                closeNew();
                router.push(`/clientes/${cliente.id}`);
              },
            })
          }
        />
      </Modal>
    </Stack>
  );
}
