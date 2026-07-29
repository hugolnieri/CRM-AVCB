import { describe, expect, it } from "vitest";
import {
  apenasDigitosCnae,
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

  it("rejects the wrong length", () => {
    expect(cnaeValido("41204")).toBe(false);
    expect(validarCnae("41204")).not.toBeNull();
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
