import { describe, expect, it } from "vitest";
import { opcoesDeMembro } from "@/lib/equipe";
import type { TeamMember } from "@/types/team";

function membro(over: Partial<TeamMember> & { id: string }): TeamMember {
  return {
    fullName: `Nome ${over.id}`,
    email: `${over.id}@x.com`,
    role: "colaborador",
    ativo: true,
    createdAt: "",
    ...over,
  };
}

const ana = membro({ id: "ana", fullName: "Ana" });
const bruno = membro({ id: "bruno", fullName: "Bruno", ativo: false });

describe("opcoesDeMembro", () => {
  it("tira quem foi desativado", () => {
    expect(opcoesDeMembro([ana, bruno])).toEqual([{ value: "ana", label: "Ana" }]);
  });

  it("mantém o desativado quando é ele o responsável atual, e diz que está inativo", () => {
    // Sem isto o Select abriria vazio no registro dele, e salvar qualquer outra
    // alteração apagaria o responsável sem ninguém pedir.
    expect(opcoesDeMembro([ana, bruno], "bruno")).toEqual([
      { value: "ana", label: "Ana" },
      { value: "bruno", label: "Bruno (inativo)" },
    ]);
  });

  it("não inventa opção para responsável que não está mais na lista", () => {
    expect(opcoesDeMembro([ana], "sumiu")).toEqual([{ value: "ana", label: "Ana" }]);
  });
});
