import { describe, expect, it } from "vitest";
import {
  alteracoesLegiveis,
  descreverEntrada,
  formatarValor,
  rotularCampo,
  tabelasPresentes,
} from "./auditoria";
import type { AuditEntry } from "@/types/auditoria";

function entry(over: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 1,
    tabela: "leads",
    registroId: "lead-1",
    acao: "update",
    memberId: "m1",
    rotulo: "Padaria São José",
    dados: null,
    createdAt: "2026-07-29T14:00:00Z",
    ...over,
  };
}

describe("formatarValor", () => {
  it("translates domain enums instead of showing the raw value", () => {
    expect(formatarValor("pipeline_stage", "visita_diagnostico_agendado")).toBe(
      "Visita/Diagnóstico Agendado",
    );
    expect(formatarValor("role", "admin")).toBe("Administrador");
    expect(formatarValor("status", "inativo")).toBe("Inativo");
    expect(formatarValor("status", "agendado")).toBe("Agendado");
  });

  // Mesma armadilha de fuso que o resto do projeto evita: new Date("2026-03-01")
  // é lido como UTC e volta 28/02 em UTC-3.
  it("formats date columns from the string, never through new Date", () => {
    expect(formatarValor("data_vencimento", "2026-03-01")).toBe("01/03/2026");
    expect(formatarValor("prazo", "2026-01-01")).toBe("01/01/2026");
  });

  it("renders empties, booleans and arrays readably", () => {
    expect(formatarValor("email", null)).toBe("vazio");
    expect(formatarValor("email", "")).toBe("vazio");
    expect(formatarValor("ativo", true)).toBe("sim");
    expect(formatarValor("ativo", false)).toBe("não");
    expect(formatarValor("possiveis_servicos", ["NR-35", "NR-10"])).toBe("NR-35, NR-10");
    expect(formatarValor("possiveis_servicos", [])).toBe("vazio");
  });

  it("passes plain text through", () => {
    expect(formatarValor("name", "Padaria São José")).toBe("Padaria São José");
  });
});

describe("rotularCampo", () => {
  it("uses the Portuguese label when there is one", () => {
    expect(rotularCampo("pipeline_stage")).toBe("Etapa");
    expect(rotularCampo("assigned_user_id")).toBe("Responsável");
  });

  // Coluna nova sem rótulo aparece crua em vez de sumir — o log fica feio, que é
  // melhor do que ficar incompleto.
  it("falls back to the raw column name", () => {
    expect(rotularCampo("coluna_nova")).toBe("coluna_nova");
  });
});

describe("alteracoesLegiveis", () => {
  it("turns the diff into labelled before/after pairs", () => {
    const e = entry({
      dados: { pipeline_stage: { de: "novo_lead", para: "contato_feito" } },
    });
    expect(alteracoesLegiveis(e)).toEqual([
      { campo: "pipeline_stage", rotulo: "Etapa", de: "Novo Lead", para: "Contato Feito" },
    ]);
  });

  // Em insert/delete `dados` é a linha inteira, não um diff: mostrar quarenta
  // campos "de vazio para X" não informa nada.
  it("is empty for insert and delete", () => {
    expect(alteracoesLegiveis(entry({ acao: "insert", dados: { name: "X" } }))).toEqual([]);
    expect(alteracoesLegiveis(entry({ acao: "delete", dados: { name: "X" } }))).toEqual([]);
  });

  it("ignores keys that are not a de/para pair", () => {
    const e = entry({ dados: { name: "solto", uf: { de: "SP", para: "RJ" } } });
    expect(alteracoesLegiveis(e).map((a) => a.campo)).toEqual(["uf"]);
  });
});

describe("descreverEntrada", () => {
  it("names the record, not its uuid", () => {
    expect(descreverEntrada(entry({ acao: "delete" }))).toBe(
      "Excluiu o lead «Padaria São José»",
    );
  });

  it("agrees with the noun's gender", () => {
    expect(descreverEntrada(entry({ acao: "insert", tabela: "metas", rotulo: "40 leads/dia" }))).toBe(
      "Criou a meta «40 leads/dia»",
    );
  });

  it("lists which fields changed on an update", () => {
    const e = entry({
      dados: {
        pipeline_stage: { de: "novo_lead", para: "contato_feito" },
        assigned_user_id: { de: null, para: "m2" },
      },
    });
    expect(descreverEntrada(e)).toBe(
      "Alterou o lead «Padaria São José»: Etapa, Responsável",
    );
  });

  it("survives a record with no label", () => {
    expect(descreverEntrada(entry({ acao: "insert", rotulo: null }))).toBe("Criou o lead");
  });

  it("falls back to the table name for a table it does not know", () => {
    expect(descreverEntrada(entry({ acao: "insert", tabela: "coisas", rotulo: "X" }))).toBe(
      "Criou o coisas «X»",
    );
  });
});

describe("tabelasPresentes", () => {
  it("lists each table once, labelled and sorted", () => {
    const entradas = [
      entry({ tabela: "servicos" }),
      entry({ tabela: "leads" }),
      entry({ tabela: "leads" }),
    ];
    expect(tabelasPresentes(entradas)).toEqual([
      { value: "leads", label: "lead" },
      { value: "servicos", label: "serviço" },
    ]);
  });
});
