"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Progress,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconTrash, IconUpload } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLeads } from "@/hooks/useLeads";
import { useClientes } from "@/hooks/useClientes";
import { useTiposServico } from "@/hooks/useServicos";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import {
  useCidadesProspeccao,
  useCompetenciaProspeccao,
  useDescartarProspeccao,
  useProspeccao,
} from "@/hooks/useProspeccao";
import { createLead } from "@/lib/supabase/queries/leads";
import { marcarComoLead } from "@/lib/supabase/queries/prospeccao";
import { getErrorMessage } from "@/lib/errors";
import { formatarCnpj } from "@/lib/cnpj";
import { exibirCodigo, segmentosDisponiveis } from "@/lib/cnae";
import { NIVEL_LABELS, PORTE_LABELS, qualificar, type NivelQualificacao } from "@/lib/qualificacao";
import { prospeccaoParaLead } from "@/lib/prospeccao";
import { StatCard } from "@/components/shared/StatCard";
import { nomeDeExibicao, type Prospeccao } from "@/types/prospeccao";

/**
 * A base de prospecção, recortada na hora.
 *
 * O robô mensal traz a região inteira; quem prospecta escolhe o pedaço. Por isso
 * os filtros estão **aqui** e não no script: quem liga sabe na segunda-feira que
 * vai trabalhar Cerquilho e construção, e não num arquivo de configuração
 * escrito um mês antes.
 *
 * Nada vem marcado. Escolher o lote é a decisão que esta tela existe para
 * provocar — despejar 3.000 empresas no kanban de uma vez o transforma em lixo,
 * e uma métrica de conversão que conta empresas que ninguém olhou mente.
 */
export function ImportarLeads({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { data: leads } = useLeads();
  const { data: clientes } = useClientes();
  const { data: tipos } = useTiposServico();
  const { data: member } = useCurrentMember();
  const queryClient = useQueryClient();
  const descartarMut = useDescartarProspeccao();

  const [cidades, setCidades] = useState<string[]>([]);
  const [segmentos, setSegmentos] = useState<string[]>([]);
  const [nivelMinimo, setNivelMinimo] = useState<NivelQualificacao | "todas">("todas");
  const [quantidade, setQuantidade] = useState<number>(50);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [gravando, setGravando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const { data: cidadesDisponiveis } = useCidadesProspeccao(opened);
  const { data: competencia } = useCompetenciaProspeccao(opened);

  // O teto do banco é maior que o da tela: a qualificação depende do catálogo,
  // que o banco não conhece, então o corte fino acontece aqui e precisa de folga
  // para não devolver menos do que o pedido depois de filtrar.
  const { data: base, isLoading } = useProspeccao(
    { cidades, cnaes: segmentos, limite: Math.max(quantidade * 4, 200) },
    opened,
  );

  const opcoesSegmento = useMemo(() => segmentosDisponiveis(), []);

  const jaNoCrm = useMemo(() => {
    const digitos = (v: string | null) => (v ?? "").replace(/\D/g, "");
    return new Set([
      ...(leads ?? []).map((l) => digitos(l.cnpj)),
      ...(clientes ?? []).map((c) => digitos(c.cnpj)),
    ]);
  }, [leads, clientes]);

  const candidatos = useMemo(() => {
    const ordem: Record<NivelQualificacao, number> = { alta: 3, media: 2, baixa: 1 };
    const minimo = nivelMinimo === "todas" ? 0 : ordem[nivelMinimo];

    return (base ?? [])
      .map((p) => ({
        p,
        q: qualificar(
          {
            cnae: p.cnae,
            porte: p.porte,
            capitalSocial: p.capitalSocial,
            matriz: p.matriz,
            inicioAtividade: p.inicioAtividade,
            telefone: p.telefone,
            email: p.email,
          },
          tipos ?? [],
        ),
        // A coleta não sabe o que já está no CRM: o robô roda uma vez por mês e
        // a carteira muda todo dia. A conferência é aqui, na hora de decidir.
        duplicada: jaNoCrm.has(p.cnpj.replace(/\D/g, "")),
      }))
      .filter((c) => ordem[c.q.nivel] >= minimo)
      .sort((a, b) => b.q.pontos - a.q.pontos)
      .slice(0, quantidade);
  }, [base, tipos, nivelMinimo, quantidade, jaNoCrm]);

  const disponiveis = candidatos.filter((c) => !c.duplicada);
  const todosMarcados = disponiveis.length > 0 && marcados.size === disponiveis.length;
  const comSugestao = disponiveis.filter((c) => c.q.servicos.length > 0).length;

  function limparSelecao<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setMarcados(new Set());
    };
  }

  function alternar(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function importar() {
    const escolhidos = disponiveis.filter((c) => marcados.has(c.p.id));
    if (escolhidos.length === 0) return;

    setGravando(true);
    setProgresso(0);
    let gravados = 0;
    const falhas: string[] = [];

    // Uma a uma, e não em lote: o insert em lote do PostgREST falha inteiro se
    // uma linha esbarrar numa constraint, e aí ninguém sabe qual das 50 foi.
    for (const [indice, { p, q }] of escolhidos.entries()) {
      try {
        const lead = await createLead(prospeccaoParaLead(p, q.servicos, member?.id ?? null));
        // Sai da fila só depois de o lead existir. Na ordem inversa, uma falha
        // no meio sumiria com a empresa sem ter criado nada.
        await marcarComoLead(p.id, lead.id);
        gravados++;
      } catch (err) {
        falhas.push(`${p.razaoSocial}: ${getErrorMessage(err, "erro")}`);
      }
      setProgresso(Math.round(((indice + 1) / escolhidos.length) * 100));
    }

    await queryClient.invalidateQueries({ queryKey: ["leads"] });
    await queryClient.invalidateQueries({ queryKey: ["prospeccao"] });
    await queryClient.invalidateQueries({ queryKey: ["prospeccaoTotal"] });
    setGravando(false);
    setMarcados(new Set());

    notifications.show({
      color: falhas.length === 0 ? "green" : "orange",
      title: `${gravados} ${gravados === 1 ? "lead importado" : "leads importados"}`,
      message:
        falhas.length === 0
          ? "Já estão no funil, em Novo Lead."
          : `${falhas.length} falharam. Primeira: ${falhas[0]}`,
      autoClose: falhas.length === 0 ? 5000 : false,
    });

    if (falhas.length === 0) onClose();
  }

  function descartarMarcados() {
    descartarMut.mutate(
      { ids: [...marcados], memberId: member?.id ?? null },
      { onSuccess: () => setMarcados(new Set()) },
    );
  }

  const baseVazia = !isLoading && (base ?? []).length === 0;
  const semFiltro = cidades.length === 0 && segmentos.length === 0 && nivelMinimo === "todas";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={3}>Importar prospecção</Title>}
      size="90rem"
    >
      <Stack>
        <Group justify="space-between" align="flex-end">
          <Text size="sm" c="dimmed">
            Empresas da região levantadas dos dados abertos da Receita. Recorte o lote, confira e
            traga para o funil.
          </Text>
          {competencia && (
            <Text size="xs" c="dimmed">
              Base de {competencia}
            </Text>
          )}
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <MultiSelect
            label="Cidade"
            placeholder="Todas"
            data={cidadesDisponiveis ?? []}
            value={cidades}
            onChange={limparSelecao(setCidades)}
            searchable
            clearable
          />
          <MultiSelect
            label="Segmento"
            placeholder="Todos"
            data={opcoesSegmento}
            value={segmentos}
            onChange={limparSelecao(setSegmentos)}
            searchable
            clearable
          />
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Qualificação
            </Text>
            <SegmentedControl
              size="sm"
              value={nivelMinimo}
              onChange={limparSelecao((v: string) =>
                setNivelMinimo(v as NivelQualificacao | "todas"),
              )}
              data={[
                { value: "todas", label: "Todas" },
                { value: "media", label: "Média+" },
                { value: "alta", label: "Alta" },
              ]}
            />
          </Stack>
          <NumberInput
            label="Quantos trazer"
            description="As mais bem qualificadas primeiro"
            min={5}
            max={500}
            step={5}
            value={quantidade}
            onChange={limparSelecao((v: string | number) => setQuantidade(Number(v) || 50))}
          />
        </SimpleGrid>

        {baseVazia && (
          <Alert color="blue" variant="light" icon={<IconAlertTriangle size={18} />}>
            {semFiltro
              ? "A base de prospecção está vazia. Ela é preenchida sob demanda: dispare o fluxo " +
                "“Prospeccao” em Actions, no GitHub, e volte aqui quando terminar."
              : "Nenhuma empresa com esses filtros. Tente abrir o recorte."}
          </Alert>
        )}

        {!baseVazia && comSugestao === 0 && disponiveis.length > 0 && (
          <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
            Nenhuma das empresas veio com serviço sugerido. Provavelmente os tipos do catálogo ainda
            não têm CNAE configurado — sem isso a lista entrega nomes, mas não entrega o que vender.
            Vale configurar em Administração → Catálogo.
          </Alert>
        )}

        <SimpleGrid cols={{ base: 2, sm: 4 }}>
          <StatCard label="No recorte" value={candidatos.length} />
          <StatCard label="Podem entrar" value={disponiveis.length} color="green" />
          <StatCard
            label="Já no CRM"
            value={candidatos.length - disponiveis.length}
            color="gray"
            hint="lead ou cliente"
          />
          <StatCard label="Com serviço sugerido" value={comSugestao} color="blue" hint="pelo CNAE" />
        </SimpleGrid>

        <Group justify="space-between">
          <Checkbox
            label={`Marcar as ${disponiveis.length} que podem entrar`}
            checked={todosMarcados}
            indeterminate={marcados.size > 0 && !todosMarcados}
            disabled={disponiveis.length === 0}
            onChange={() =>
              setMarcados(todosMarcados ? new Set() : new Set(disponiveis.map((c) => c.p.id)))
            }
          />
          <Text size="sm" c="dimmed">
            {marcados.size} selecionadas
          </Text>
        </Group>

        <ScrollArea.Autosize mah={420}>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40} />
                <Table.Th>Empresa</Table.Th>
                <Table.Th>Cidade</Table.Th>
                <Table.Th>Segmento</Table.Th>
                <Table.Th>Qualificação</Table.Th>
                <Table.Th>Sugestão</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {candidatos.map(({ p, q, duplicada }) => (
                <Linha
                  key={p.id}
                  prospeccao={p}
                  qualificacao={q}
                  duplicada={duplicada}
                  marcado={marcados.has(p.id)}
                  onToggle={() => alternar(p.id)}
                />
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>

        {gravando && <Progress value={progresso} striped animated />}

        <Group justify="space-between">
          {/* Descartar tira da fila para sempre: a coleta do mês que vem não a
              traz de volta. É o que impede a mesma empresa recusada de reaparecer
              todo mês. */}
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconTrash size={16} />}
            disabled={marcados.size === 0 || gravando}
            loading={descartarMut.isPending}
            onClick={descartarMarcados}
          >
            Descartar {marcados.size > 0 ? marcados.size : ""}
          </Button>
          <Button
            leftSection={<IconUpload size={16} />}
            disabled={marcados.size === 0}
            loading={gravando}
            onClick={importar}
          >
            Importar {marcados.size > 0 ? marcados.size : ""}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function Linha({
  prospeccao: p,
  qualificacao: q,
  duplicada,
  marcado,
  onToggle,
}: {
  prospeccao: Prospeccao;
  qualificacao: ReturnType<typeof qualificar>;
  duplicada: boolean;
  marcado: boolean;
  onToggle: () => void;
}) {
  return (
    <Table.Tr style={{ opacity: duplicada ? 0.5 : 1 }}>
      <Table.Td>
        <Checkbox checked={marcado} disabled={duplicada} onChange={onToggle} />
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw={500} lineClamp={1}>
          {nomeDeExibicao(p)}
        </Text>
        <Text size="xs" c="dimmed">
          {formatarCnpj(p.cnpj)}
          {p.porte && PORTE_LABELS[p.porte] && ` · ${PORTE_LABELS[p.porte]}`}
          {p.telefone && ` · ${p.telefone}`}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{p.cidade}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" lineClamp={1}>
          {p.cnaeDescricao ?? "—"}
        </Text>
        <Text size="xs" c="dimmed">
          {exibirCodigo(p.cnae)}
        </Text>
      </Table.Td>
      <Table.Td>
        {/* O motivo junto do selo: um número opaco não deixa ninguém discordar. */}
        <Tooltip
          label={q.motivos.join(" · ")}
          multiline
          w={320}
          withArrow
          disabled={q.motivos.length === 0}
        >
          <Badge color={NIVEL_LABELS[q.nivel].color} variant="light" size="sm">
            {NIVEL_LABELS[q.nivel].label}
          </Badge>
        </Tooltip>
      </Table.Td>
      <Table.Td>
        {duplicada ? (
          <Badge color="gray" variant="light" size="sm">
            Já no CRM
          </Badge>
        ) : q.servicos.length > 0 ? (
          <Group gap={4}>
            {q.servicos.slice(0, 2).map((s) => (
              <Badge key={s} color="blue" variant="light" size="sm">
                {s}
              </Badge>
            ))}
            {q.servicos.length > 2 && (
              <Text size="xs" c="dimmed">
                +{q.servicos.length - 2}
              </Text>
            )}
          </Group>
        ) : (
          <Text size="xs" c="dimmed">
            —
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  );
}
