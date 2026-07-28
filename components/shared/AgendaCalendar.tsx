"use client";

import { useMemo } from "react";
import { ActionIcon, Badge, Box, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import dayjs from "dayjs";

export type EventoTipo = "retorno" | "vencimento" | "agendado";

export interface EventoAgenda {
  id: string;
  /** "YYYY-MM-DD" — dia local do evento. */
  date: string;
  tipo: EventoTipo;
  titulo: string;
  /** "14:30", quando o evento tem hora. */
  hora?: string;
  onClick?: () => void;
}

export const EVENTO_CORES: Record<EventoTipo, string> = {
  retorno: "blue",
  vencimento: "orange",
  agendado: "grape",
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Nomes escritos à mão em vez de `dayjs().format("MMMM")`.
 *
 * `dayjs.locale("pt-br")` NÃO é chamado globalmente neste projeto (o
 * DatesProvider em app/providers.tsx configura só os componentes do Mantine),
 * então `format("MMMM")` sairia em inglês em silêncio. Mesma razão pela qual as
 * janelas de vencimento são móveis e não de calendário — ver lib/vencimentos.ts.
 */
const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

interface Props {
  eventos: EventoAgenda[];
  /** Primeiro dia do mês exibido, "YYYY-MM-DD". */
  mes: string;
  onMesChange: (mes: string) => void;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}

/**
 * Grade mensal de verdade: 7 colunas, células altas, eventos listados dentro do
 * dia.
 *
 * Substitui o `<Calendar>` do Mantine, que é um date-picker compacto — cabia
 * apenas um ponto colorido por dia, sem dizer o que era nem quantos. Aqui a
 * grade é montada com CSS Grid e dayjs, sem lib nova.
 *
 * Todas as datas circulam como string "YYYY-MM-DD". Isso é deliberado: as
 * colunas `date` do banco não têm fuso, e passar por `new Date(...)` faria
 * 2026-03-01 virar 28/02 em UTC-3. Quem tem hora de verdade (follow-up,
 * agendamento) já chega convertido para dia local pelo chamador.
 */
export function AgendaCalendar({
  eventos,
  mes,
  onMesChange,
  selectedDay,
  onSelectDay,
}: Props) {
  const inicioMes = dayjs(mes).startOf("month");
  const hoje = dayjs().format("YYYY-MM-DD");

  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoAgenda[]>();
    for (const evento of eventos) {
      const lista = mapa.get(evento.date) ?? [];
      lista.push(evento);
      mapa.set(evento.date, lista);
    }
    // Dentro do dia, quem tem hora vem primeiro e em ordem cronológica.
    for (const lista of mapa.values()) {
      lista.sort((a, b) => (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99"));
    }
    return mapa;
  }, [eventos]);

  // A grade começa no domingo da semana do dia 1 e cobre semanas inteiras, para
  // não deixar buraco na primeira e na última linha.
  //
  // O recuo é calculado com day() (0 = domingo, valor absoluto) em vez de
  // startOf("week"), que depende do locale ativo do dayjs — como o locale nunca
  // é definido globalmente aqui, startOf("week") funcionaria por acidente e
  // quebraria no dia em que alguém chamasse dayjs.locale("pt-br").
  const primeiraCelula = inicioMes.subtract(inicioMes.day(), "day");
  const fimMes = inicioMes.endOf("month");
  const ultimaCelula = fimMes.add(6 - fimMes.day(), "day");
  const totalDias = ultimaCelula.diff(primeiraCelula, "day") + 1;
  const celulas = Array.from({ length: totalDias }, (_, i) => primeiraCelula.add(i, "day"));

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => onMesChange(inicioMes.subtract(1, "month").format("YYYY-MM-DD"))}
          aria-label="Mês anterior"
        >
          <IconChevronLeft size={18} />
        </ActionIcon>
        <Title order={4}>
          {MESES[inicioMes.month()]} de {inicioMes.year()}
        </Title>
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => onMesChange(inicioMes.add(1, "month").format("YYYY-MM-DD"))}
          aria-label="Próximo mês"
        >
          <IconChevronRight size={18} />
        </ActionIcon>
      </Group>

      <Box style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {DIAS_SEMANA.map((dia) => (
          <Text key={dia} size="xs" c="dimmed" ta="center" fw={600}>
            {dia}
          </Text>
        ))}

        {celulas.map((celula) => {
          const chave = celula.format("YYYY-MM-DD");
          const doDia = porDia.get(chave) ?? [];
          const foraDoMes = !celula.isSame(inicioMes, "month");
          const isHoje = chave === hoje;
          const isSelecionado = chave === selectedDay;

          return (
            <Paper
              key={chave}
              withBorder
              p={4}
              radius="sm"
              onClick={() => onSelectDay(isSelecionado ? null : chave)}
              style={{
                minHeight: 92,
                cursor: "pointer",
                opacity: foraDoMes ? 0.4 : 1,
                borderColor: isSelecionado ? "var(--mantine-color-blue-5)" : undefined,
                borderWidth: isSelecionado ? 2 : undefined,
                backgroundColor: isHoje ? "var(--mantine-color-blue-light)" : undefined,
              }}
            >
              <Text size="xs" fw={isHoje ? 700 : 500} ta="right" mb={2}>
                {celula.date()}
              </Text>
              <Stack gap={2}>
                {doDia.slice(0, 3).map((evento) => (
                  <Badge
                    key={evento.id}
                    color={EVENTO_CORES[evento.tipo]}
                    variant="light"
                    size="xs"
                    fullWidth
                    styles={{ label: { overflow: "hidden", textOverflow: "ellipsis" } }}
                    onClick={(e) => {
                      if (!evento.onClick) return;
                      // Não deixa o clique no evento também selecionar o dia.
                      e.stopPropagation();
                      evento.onClick();
                    }}
                  >
                    {evento.hora ? `${evento.hora} ${evento.titulo}` : evento.titulo}
                  </Badge>
                ))}
                {doDia.length > 3 && (
                  <Text size="xs" c="dimmed" ta="center">
                    +{doDia.length - 3}
                  </Text>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </Stack>
  );
}
