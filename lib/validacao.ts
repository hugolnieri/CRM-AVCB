import { cnpjValido } from "@/lib/cnpj";
import { normalizePhoneToE164 } from "@/lib/phone";

/**
 * Regras de validação compartilhadas por LeadForm e ClienteForm.
 *
 * Ficam num módulo só porque os dois formulários precisam concordar: o lead vira
 * cliente por conversão (lib/conversao.ts), e se o cadastro de cliente exigir
 * algo que o de lead não exige, a conversão produz um cliente que não passaria
 * no próprio formulário.
 *
 * Cada função devolve a mensagem de erro ou `null`, que é o contrato de
 * `validate` do @mantine/form.
 */

const EMAIL = /^\S+@\S+\.\S+$/;

/** Obrigatório o suficiente para ser um nome, não um espaço em branco. */
export function exigirTexto(valor: string, mensagem: string, minimo = 2): string | null {
  return valor.trim().length < minimo ? mensagem : null;
}

/** E-mail é opcional em si; inválido nunca é aceito. */
export function validarEmail(valor: string): string | null {
  return valor.trim() === "" || EMAIL.test(valor) ? null : "E-mail inválido.";
}

/**
 * Telefone e e-mail são um par: exigir os dois barraria o lead de Maps que só
 * tem telefone, e não exigir nenhum deixa entrar cadastro em que não dá para
 * falar com ninguém — que é o que este campo existe para evitar.
 *
 * A mesma regra é aplicada aos dois campos no formulário, para os dois
 * acenderem juntos: o erro é do par, não de um deles.
 */
export function exigirContato(telefone: string, email: string): string | null {
  return telefone.trim() === "" && email.trim() === ""
    ? "Informe ao menos um: telefone ou e-mail."
    : null;
}

/** Telefone só é validado quando preenchido — vazio é problema do par acima. */
export function validarTelefone(valor: string): string | null {
  if (valor.trim() === "") return null;
  return normalizePhoneToE164(valor) === null
    ? "Telefone inválido. Use DDD + número, com 10 ou 11 dígitos."
    : null;
}

/** CNPJ opcional, mas nunca torto — ver o cabeçalho de lib/cnpj.ts. */
export function validarCnpj(valor: string): string | null {
  return valor.trim() === "" || cnpjValido(valor) ? null : "CNPJ inválido. Confira os dígitos.";
}

/**
 * As 27 unidades da federação, na ordem em que aparecem no Select.
 *
 * Virou lista escolhível em vez de campo livre pelo motivo prático: o mapa do
 * pipeline agrupa por cidade **e** UF (`chaveCidade`), então "SP" e "sp"
 * digitados por pessoas diferentes partiam a mesma cidade em duas bolhas.
 */
export const UF_OPCOES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const UFS = new Set(UF_OPCOES);

/** UF opcional; se preenchida, precisa ser uma das 27. */
export function validarUf(valor: string): string | null {
  const uf = valor.trim().toUpperCase();
  return uf === "" || UFS.has(uf) ? null : "UF inválida.";
}
