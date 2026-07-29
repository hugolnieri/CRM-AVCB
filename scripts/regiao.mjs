/**
 * As camadas da área de atuação, para os scripts.
 *
 * Espelha `lib/regiao.ts`. Duplicado porque os scripts rodam fora do bundler do
 * Next e não conseguem importar TypeScript — mas a duplicação **não pode
 * divergir em silêncio**, então `lib/regiao.test.ts` compara as duas listas e
 * quebra se alguém mexer numa e esquecer a outra.
 *
 * Se um dia o projeto ganhar um passo de build para os scripts, este arquivo
 * deixa de fazer sentido: apague-o e importe de `lib/regiao.ts`.
 */

export const CAMADAS = [
  {
    id: "vizinhas",
    cidades: [
      "Cerquilho",
      "Tietê",
      "Jumirim",
      "Boituva",
      "Cesário Lange",
      "Laranjal Paulista",
      "Tatuí",
    ],
  },
  {
    id: "sorocaba",
    cidades: [
      "Sorocaba",
      "Votorantim",
      "Itu",
      "Salto",
      "Porto Feliz",
      "Capela do Alto",
      "Iperó",
      "Araçoiaba da Serra",
      "Alumínio",
      "Mairinque",
      "Araçariguama",
      "São Roque",
      "Salto de Pirapora",
      "Sarapuí",
    ],
  },
  {
    id: "ampliada",
    cidades: [
      "Itapetininga",
      "Piedade",
      "Pilar do Sul",
      "Ibiúna",
      "Conchas",
      "Pereiras",
      "Porangaba",
      "Quadra",
      "Torre de Pedra",
      "Anhembi",
      "Bofete",
      "Guareí",
      "Alambari",
      "Capão Bonito",
      "Angatuba",
      "Piracicaba",
      "Rio das Pedras",
      "Saltinho",
      "Elias Fausto",
      "Capivari",
      "Monte Mor",
      "Indaiatuba",
    ],
  },
];

/** Todas as cidades das camadas escolhidas, sem repetir. */
export function cidadesDasCamadas(ids) {
  const escolhidas = new Set(ids);
  const nomes = CAMADAS.filter((c) => escolhidas.has(c.id)).flatMap((c) => c.cidades);
  return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
