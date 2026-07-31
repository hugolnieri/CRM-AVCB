/**
 * Formatação de metadados de arquivo para a tela.
 *
 * Mora aqui, e não no componente, pelo mesmo motivo do resto de `lib/`: é
 * lógica pura, tem casos de borda que se erra calado (nulo, zero byte, o salto
 * de 1023 para 1 KB) e por isso merece teste sem jsdom.
 */

const UNIDADES = ["B", "KB", "MB", "GB"];

/**
 * "2,4 MB". Base 1024, com vírgula decimal — a interface inteira é pt-BR.
 *
 * Nulo vira travessão em vez de "0 B": a coluna é anulável, e um arquivo
 * legítimo de zero byte é coisa diferente de tamanho não registrado.
 */
export function formatarTamanho(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;

  let valor = bytes;
  let unidade = 0;
  while (valor >= 1024 && unidade < UNIDADES.length - 1) {
    valor /= 1024;
    unidade += 1;
  }

  // Uma casa decimal só a partir de KB: "1,5 KB" ajuda, "1536,0 B" não.
  return `${valor.toFixed(1).replace(".", ",")} ${UNIDADES[unidade]}`;
}

/**
 * A extensão em maiúsculas, para o selo da lista: "PDF", "DOCX".
 *
 * Sai do nome e não do mime porque o mime chega vazio de alguns navegadores, e
 * porque "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
 * não é o que alguém quer ler numa lista.
 */
export function extensaoDe(nome: string): string {
  const partes = nome.split(".");
  if (partes.length < 2) return "";
  return partes[partes.length - 1].toUpperCase();
}
