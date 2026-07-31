import { describe, expect, it } from "vitest";
import { extensaoDe, formatarTamanho } from "./arquivos";

describe("formatarTamanho", () => {
  it("keeps raw bytes below 1 KB", () => {
    expect(formatarTamanho(0)).toBe("0 B");
    expect(formatarTamanho(1023)).toBe("1023 B");
  });

  it("climbs units at 1024 and uses a comma decimal", () => {
    expect(formatarTamanho(1024)).toBe("1,0 KB");
    expect(formatarTamanho(1536)).toBe("1,5 KB");
    expect(formatarTamanho(1024 * 1024)).toBe("1,0 MB");
    expect(formatarTamanho(2.4 * 1024 * 1024)).toBe("2,4 MB");
  });

  it("stops at GB instead of inventing a unit", () => {
    expect(formatarTamanho(1024 ** 3)).toBe("1,0 GB");
    expect(formatarTamanho(1024 ** 4)).toBe("1024,0 GB");
  });

  // A coluna é anulável: "tamanho não registrado" não é a mesma coisa que um
  // arquivo de zero byte, então não pode cair no mesmo texto.
  it("shows a dash for a missing size, not zero", () => {
    expect(formatarTamanho(null)).toBe("—");
    expect(formatarTamanho(undefined)).toBe("—");
    expect(formatarTamanho(0)).not.toBe("—");
  });
});

describe("extensaoDe", () => {
  it("uppercases the extension", () => {
    expect(extensaoDe("Apostila NR-35.pdf")).toBe("PDF");
    expect(extensaoDe("roteiro.docx")).toBe("DOCX");
  });

  it("takes the last segment of a name with several dots", () => {
    expect(extensaoDe("apostila.v2.final.pdf")).toBe("PDF");
  });

  it("is empty when there is no extension", () => {
    expect(extensaoDe("apostila")).toBe("");
  });
});
