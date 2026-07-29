/**
 * Senha provisória gerada pelo admin, para ele passar à pessoa.
 *
 * O alfabeto exclui os caracteres que se confundem quando alguém dita a senha
 * por telefone ou copia de um papel: `0`/`O`, `1`/`l`/`I`, `5`/`S`, `2`/`Z`.
 * Uma senha provisória existe para ser transcrita uma vez — se ela for
 * ambígua, o custo aparece como "não consigo entrar", não como insegurança.
 *
 * Sem símbolos pela mesma razão: `#` e `&` viram problema de teclado no celular
 * e não compram entropia que o comprimento não compre mais barato.
 */
const ALFABETO = "ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnopqrstuvwxyz346789";

export const SENHA_MINIMA = 8;

/**
 * 12 caracteres do alfabeto acima dão ~68 bits — folgado para uma senha que
 * vive até a pessoa trocar, e ainda curto o bastante para ser ditado.
 *
 * Usa `crypto.getRandomValues` e não `Math.random`: o segundo é previsível a
 * partir de saídas anteriores, e aqui isso significaria adivinhar a senha do
 * próximo colaborador cadastrado.
 */
export function gerarSenha(tamanho = 12): string {
  const bytes = new Uint32Array(tamanho);
  crypto.getRandomValues(bytes);

  let senha = "";
  for (let i = 0; i < tamanho; i++) {
    senha += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return senha;
}

/** Mensagem de erro ou null, no contrato do `validate` do @mantine/form. */
export function validarSenha(senha: string): string | null {
  if (senha.length < SENHA_MINIMA) {
    return `A senha precisa ter ao menos ${SENHA_MINIMA} caracteres.`;
  }
  return null;
}

export function validarConfirmacao(senha: string, confirmacao: string): string | null {
  return senha === confirmacao ? null : "As senhas não coincidem.";
}
