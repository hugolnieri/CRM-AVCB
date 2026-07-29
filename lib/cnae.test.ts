import { describe, expect, it } from "vitest";
import {
  apenasDigitosCnae,
  buscarCnae,
  descreverCnae,
  exibirCodigo,
  segmentoDoCnae,
  cnaeCasaPrefixos,
  cnaeValido,
  formatarCnae,
  normalizarPrefixos,
  servicosParaCnae,
  validarCnae,
  validarPrefixoCnae,
} from "./cnae";
import { makeTipoServico } from "./testFixtures";

// 4120-4/00 = Construção de edifícios.
const CONSTRUCAO = "4120-4/00";

describe("formatarCnae", () => {
  it("formats seven digits", () => {
    expect(formatarCnae("4120400")).toBe("4120-4/00");
  });

  it("leaves anything else alone", () => {
    expect(formatarCnae("412")).toBe("412");
    expect(formatarCnae("")).toBe("");
  });
});

describe("cnaeValido / validarCnae", () => {
  it("accepts seven digits, punctuated or not", () => {
    expect(cnaeValido(CONSTRUCAO)).toBe(true);
    expect(cnaeValido("4120400")).toBe(true);
    expect(validarCnae(CONSTRUCAO)).toBeNull();
  });

  // Aceita os tres niveis: quem cadastra costuma saber o ramo, nao o codigo
  // exato, e recusar a divisao obrigaria a inventar digitos.
  it("accepts any level of the hierarchy", () => {
    expect(cnaeValido("41")).toBe(true);
    expect(cnaeValido("41204")).toBe(true);
    expect(validarCnae("41")).toBeNull();
  });

  it("rejects what cannot be a CNAE at any level", () => {
    expect(cnaeValido("4")).toBe(false);
    expect(cnaeValido("41204001")).toBe(false);
    expect(validarCnae("4")).not.toBeNull();
  });

  it("treats empty as fine — the field is optional", () => {
    expect(validarCnae("")).toBeNull();
    expect(validarCnae("   ")).toBeNull();
  });
});

describe("validarPrefixoCnae", () => {
  it("accepts anything from the division to the full subclass", () => {
    expect(validarPrefixoCnae("41")).toBeNull();
    expect(validarPrefixoCnae("4120")).toBeNull();
    expect(validarPrefixoCnae("4120-4/00")).toBeNull();
  });

  // Um dígito é a seção inteira da economia: casaria com quase tudo, e uma
  // sugestão que aponta para tudo não sugere nada.
  it("rejects a single digit", () => {
    expect(validarPrefixoCnae("4")).not.toBeNull();
  });

  it("rejects more than a full CNAE", () => {
    expect(validarPrefixoCnae("41204001")).not.toBeNull();
  });
});

describe("normalizarPrefixos", () => {
  it("strips punctuation, drops junk and deduplicates", () => {
    expect(normalizarPrefixos(["41", "41.20", "4120", "x", "4", ""])).toEqual(["41", "4120"]);
  });
});

describe("cnaeCasaPrefixos", () => {
  it("matches by prefix, so the division covers everything under it", () => {
    expect(cnaeCasaPrefixos(CONSTRUCAO, ["41"])).toBe(true);
    expect(cnaeCasaPrefixos(CONSTRUCAO, ["4120"])).toBe(true);
    expect(cnaeCasaPrefixos(CONSTRUCAO, ["4120400"])).toBe(true);
  });

  it("does not match a sibling division", () => {
    expect(cnaeCasaPrefixos(CONSTRUCAO, ["42"])).toBe(false);
    expect(cnaeCasaPrefixos(CONSTRUCAO, ["4121"])).toBe(false);
  });

  it("is false when there is nothing to match against", () => {
    expect(cnaeCasaPrefixos(CONSTRUCAO, null)).toBe(false);
    expect(cnaeCasaPrefixos(CONSTRUCAO, [])).toBe(false);
    expect(cnaeCasaPrefixos("", ["41"])).toBe(false);
  });

  it("ignores punctuation on both sides", () => {
    expect(cnaeCasaPrefixos("4120-4/00", ["41.2"])).toBe(true);
  });
});

describe("servicosParaCnae", () => {
  const altura = makeTipoServico({ id: "nr35", nome: "NR-35", cnaes: ["41", "42"], ordem: 10 });
  const eletrica = makeTipoServico({ id: "nr10", nome: "NR-10", cnaes: ["4120"], ordem: 20 });
  const espaco = makeTipoServico({ id: "nr33", nome: "NR-33", cnaes: ["10"], ordem: 30 });
  const semRegra = makeTipoServico({ id: "livre", nome: "Palestra", cnaes: null, ordem: 40 });

  it("returns only the services whose rules cover the CNAE", () => {
    const r = servicosParaCnae(CONSTRUCAO, [altura, eletrica, espaco, semRegra]);
    expect(r.map((t) => t.id)).toEqual(["nr10", "nr35"]);
  });

  // Uma regra escrita para a subclasse exata é mais deliberada do que uma que
  // pegou a divisão inteira.
  it("puts the more specific rule first", () => {
    const generico = makeTipoServico({ id: "gen", cnaes: ["41"], ordem: 1 });
    const especifico = makeTipoServico({ id: "esp", cnaes: ["4120400"], ordem: 99 });
    const r = servicosParaCnae(CONSTRUCAO, [generico, especifico]);
    expect(r.map((t) => t.id)).toEqual(["esp", "gen"]);
  });

  it("never suggests an inactive type", () => {
    const desativado = makeTipoServico({ id: "off", cnaes: ["41"], ativo: false });
    expect(servicosParaCnae(CONSTRUCAO, [desativado])).toEqual([]);
  });

  it("returns nothing without a CNAE", () => {
    expect(servicosParaCnae("", [altura])).toEqual([]);
  });
});

describe("apenasDigitosCnae", () => {
  it("keeps only digits", () => {
    expect(apenasDigitosCnae("4120-4/00")).toBe("4120400");
  });
});

describe("descreverCnae", () => {
  it("names the activity from the code, most specific first", () => {
    // 41204 e a classe "Construcao de Edificios"; 41 e a divisao homonima.
    expect(descreverCnae("4120-4/00")).toBe("Construção de Edifícios");
    expect(descreverCnae("41")).toBe("Construção de Edifícios");
  });

  it("falls back to the division when the class is unknown", () => {
    // 4399 existe como classe; 43 e a divisao de servicos especializados.
    expect(descreverCnae("43")).toContain("Serviços Especializados");
  });

  it("returns null for something too short to place", () => {
    expect(descreverCnae("4")).toBeNull();
    expect(descreverCnae("")).toBeNull();
  });
});

describe("segmentoDoCnae", () => {
  it("always resolves to the division, never the class", () => {
    const s = segmentoDoCnae("4120-4/00");
    expect(s?.[0]).toBe("41");
  });

  it("is null when there is no division to find", () => {
    expect(segmentoDoCnae("9")).toBeNull();
  });
});

describe("buscarCnae", () => {
  // O ponto do recurso: ninguem sabe o CNAE de cor, mas sabe dizer o ramo.
  it("finds activities by name", () => {
    const r = buscarCnae("padaria");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((x) => x.descricao.toLowerCase().includes("padaria"))).toBe(true);
  });

  it("ignores accents and case", () => {
    const comAcento = buscarCnae("construção");
    const semAcento = buscarCnae("CONSTRUCAO");
    expect(semAcento.map((x) => x.codigo)).toEqual(comAcento.map((x) => x.codigo));
  });

  it("finds by code, and a full CNAE reaches its class", () => {
    expect(buscarCnae("41").some((x) => x.codigo === "41")).toBe(true);
    expect(buscarCnae("4120400").some((x) => x.codigo === "41204")).toBe(true);
  });

  it("puts a name that starts with the term ahead of one that merely contains it", () => {
    const r = buscarCnae("transporte");
    expect(r[0].descricao.toLowerCase().startsWith("transporte")).toBe(true);
  });

  it("lists the divisions as browsable segments when nothing was typed", () => {
    const r = buscarCnae("", 5);
    expect(r).toHaveLength(5);
    expect(r.every((x) => x.nivel === "divisao")).toBe(true);
  });

  it("tells which segment a class belongs to", () => {
    const classe = buscarCnae("4120400")[0];
    expect(classe.nivel).toBe("classe");
    expect(classe.segmento).toBe("Construção de Edifícios");
  });

  it("respects the limit", () => {
    expect(buscarCnae("de", 3)).toHaveLength(3);
  });
});

describe("exibirCodigo", () => {
  it("punctuates each level the way people read it", () => {
    expect(exibirCodigo("4120400")).toBe("4120-4/00");
    expect(exibirCodigo("41204")).toBe("4120-4");
    expect(exibirCodigo("41")).toBe("41");
  });
});
