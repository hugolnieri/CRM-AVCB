"use client";

import { useMemo } from "react";
import { Indicator, Center } from "@mantine/core";
import { Calendar } from "@mantine/dates";
import dayjs from "dayjs";
import { leadsWithFollowUp } from "@/lib/followup";
import type { Lead } from "@/types/lead";

interface Props {
  leads: Lead[];
  /** Dia selecionado no formato "YYYY-MM-DD" (ou null = nenhum). */
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}

/**
 * Calendário do mês com um ponto nos dias que têm retorno agendado
 * (vermelho se o dia já passou, azul se é hoje/futuro). Clicar num dia
 * seleciona/deseleciona para filtrar a lista abaixo.
 */
export function FollowUpCalendar({ leads, selectedDay, onSelectDay }: Props) {
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const lead of leadsWithFollowUp(leads)) {
      const key = dayjs(lead.followUpAt).format("YYYY-MM-DD");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [leads]);

  const today = dayjs().format("YYYY-MM-DD");

  return (
    <Center>
      <Calendar
        getDayProps={(date) => ({
          selected: date === selectedDay,
          onClick: () => onSelectDay(date === selectedDay ? null : date),
        })}
        renderDay={(date) => {
          const count = byDay.get(date) ?? 0;
          const day = dayjs(date).date();
          const overdue = date < today;
          return (
            <Indicator
              size={7}
              color={overdue ? "red" : "blue"}
              offset={-3}
              disabled={count === 0}
            >
              <div>{day}</div>
            </Indicator>
          );
        }}
      />
    </Center>
  );
}
