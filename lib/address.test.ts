import { describe, expect, it } from "vitest";
import { parseLogradouro } from "./address";

describe("parseLogradouro", () => {
  it("strips the street-type prefix and extracts the number", () => {
    expect(parseLogradouro("Av. João Pilon, 957")).toEqual({
      logradouro: "João Pilon",
      numero: "957",
    });
    expect(parseLogradouro("R. Ângelo Luvizotto, 146 - sala 2")).toEqual({
      logradouro: "Ângelo Luvizotto",
      numero: "146",
    });
    expect(parseLogradouro("Rua Antônio Costa Magueta")).toEqual({
      logradouro: "Antônio Costa Magueta",
      numero: "",
    });
  });

  it("keeps non-street-type words like 'Pref.' and 'Pres.'", () => {
    expect(parseLogradouro("Av. Pref. Antônio Souto, 1148")).toEqual({
      logradouro: "Pref. Antônio Souto",
      numero: "1148",
    });
  });

  it("handles a number with a letter suffix", () => {
    expect(parseLogradouro("Pr. Pres. Kennedy, 51A - e 51B")).toEqual({
      logradouro: "Pres. Kennedy",
      numero: "51A",
    });
  });

  it("returns empty parts for missing address", () => {
    expect(parseLogradouro(null)).toEqual({ logradouro: "", numero: "" });
    expect(parseLogradouro("")).toEqual({ logradouro: "", numero: "" });
  });
});
