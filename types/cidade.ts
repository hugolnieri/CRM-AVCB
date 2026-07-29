/**
 * Coordenada de uma cidade, em cache. Não é cadastro: ninguém preenche isto à
 * mão, a linha nasce da geocodificação e existe só para o mapa não depender de
 * rede a cada abertura.
 */
export interface Cidade {
  /** "sorocaba|sp" — a mesma chave que `chaveCidade()` produz em lib/mapa.ts. */
  chave: string;
  nome: string;
  uf: string;
  /** Null = a geocodificação não achou. A cidade vai para "Sem localização". */
  lat: number | null;
  lng: number | null;
  tentadaEm: string | null;
  createdAt: string;
}
