import dayjs from "dayjs";
import type { TipoTreinamento } from "@/types/treinamento";

/**
 * Data de vencimento sugerida: realização + validade do tipo.
 *
 * Trabalha com strings "YYYY-MM-DD" em todo o caminho, nunca com Date. A coluna
 * é `date` (sem hora nem fuso) e `new Date("2026-03-01")` seria interpretado
 * como UTC, voltando como 28/02 em UTC-3.
 *
 * O dayjs corta o dia para o fim do mês quando ele não existe no mês de destino
 * (31/01 + 1 mês = 28/02), o que é o comportamento desejado — e está fixado em
 * teste para uma mudança futura do dayjs não deslocar certificados em silêncio.
 */
export function sugerirVencimento(
  dataRealizacao: string,
  validadeMeses: number | null,
): string | null {
  if (!validadeMeses || !dataRealizacao) return null;
  return dayjs(dataRealizacao).add(validadeMeses, "month").format("YYYY-MM-DD");
}

/** Rótulo do catálogo: "NR-35 — Trabalho em Altura". */
export function rotuloTipo(tipo: TipoTreinamento): string {
  return tipo.sigla ? `${tipo.sigla} — ${tipo.nome}` : tipo.nome;
}
