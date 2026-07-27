"use client";

import { useMemo } from "react";
import { Center, Indicator } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import dayjs from "dayjs";

export type MarcadorTipo = "retorno" | "vencimento";

export interface Marcador {
  /** "YYYY-MM-DD". */
  date: string;
  tipo: MarcadorTipo;
}

interface Props {
  marcadores: Marcador[];
  /** Dia selecionado no formato "YYYY-MM-DD" (ou null = nenhum). */
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}

/**
 * Calendário do mês com um ponto nos dias marcados. Vencimento tem prioridade
 * visual sobre retorno quando os dois caem no mesmo dia; passado fica vermelho.
 *
 * O `Calendar` do Mantine v9 entrega `date` como string "YYYY-MM-DD" para
 * getDayProps/renderDay — por isso a comparação com hoje é feita direto entre
 * strings. Marcadores já chegam nesse formato e NÃO devem ser reformatados com
 * dayjs().format() "por consistência": passar uma data pura por Date reintroduz
 * o erro de fuso que o formato de string evita.
 */
export function AgendaCalendar({ marcadores, selectedDay, onSelectDay }: Props) {
  const byDay = useMemo(() => {
    const map = new Map<string, Set<MarcadorTipo>>();
    for (const m of marcadores) {
      const tipos = map.get(m.date) ?? new Set<MarcadorTipo>();
      tipos.add(m.tipo);
      map.set(m.date, tipos);
    }
    return map;
  }, [marcadores]);

  const today = dayjs().format("YYYY-MM-DD");

  return (
    <Center>
      <Calendar
        getDayProps={(date) => ({
          selected: date === selectedDay,
          onClick: () => onSelectDay(date === selectedDay ? null : date),
        })}
        renderDay={(date) => {
          const tipos = byDay.get(date);
          const day = dayjs(date).date();
          const color = !tipos
            ? "gray"
            : date < today
              ? "red"
              : tipos.has("vencimento")
                ? "orange"
                : "blue";

          return (
            <Indicator size={7} color={color} offset={-3} disabled={!tipos}>
              <div>{day}</div>
            </Indicator>
          );
        }}
      />
    </Center>
  );
}
