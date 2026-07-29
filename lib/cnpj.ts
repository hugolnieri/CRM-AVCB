/**
 * Validação e formatação de CNPJ.
 *
 * Por que validar um campo que é opcional: `clientes.cnpj` é UNIQUE, e o lead
 * vira cliente pela conversão carregando o CNPJ junto. Um dígito trocado entra
 * como chave permanente e produz uma duplicata que só dá para resolver
 * apagando o cadastro — que é justamente a operação que este sistema restringe.
 * Barrar na digitação custa uma função pura; barrar depois custa uma migração.
 */

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Dígito verificador pelo módulo 11, com os pesos cíclicos 2..9 da Receita. */
function digitoVerificador(base: string): number {
  let soma = 0;
  let peso = 2;

  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Verdadeiro para um CNPJ com 14 dígitos e os dois verificadores corretos.
 *
 * Sequências de dígito repetido (`00000000000000`, `11111111111111`) são
 * rejeitadas à parte: elas passam no cálculo do módulo 11 e são exatamente o
 * que alguém digita para "preencher" o campo.
 */
export function cnpjValido(valor: string): boolean {
  const digitos = apenasDigitos(valor);
  if (digitos.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digitos)) return false;

  const base = digitos.slice(0, 12);
  const primeiro = digitoVerificador(base);
  const segundo = digitoVerificador(base + primeiro);

  return digitos === `${base}${primeiro}${segundo}`;
}

/** "12345678000199" → "12.345.678/0001-99". Devolve a entrada se não der 14 dígitos. */
export function formatarCnpj(valor: string): string {
  const d = apenasDigitos(valor);
  if (d.length !== 14) return valor;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
