/**
 * Validacao de ISBN-13 pelo digito verificador.
 *
 * O ISBN-13 tem 13 digitos. Os 12 primeiros carregam a informacao e o 13o e um
 * digito verificador: somando cada digito multiplicado alternadamente por 1 e 3,
 * o total precisa ser multiplo de 10.
 */

const TAMANHO_ISBN13 = 13;
const ZERO_ASCII = 48;

/** Remove hifens e espacos, que sao separadores visuais e nao fazem parte do codigo. */
export function normalizarIsbn(entrada: string): string {
  return entrada.replace(/[\s-]/g, '');
}

export function isbnValido(entrada: string): boolean {
  const isbn = normalizarIsbn(entrada);

  if (isbn.length !== TAMANHO_ISBN13) return false;
  if (!/^\d{13}$/.test(isbn)) return false;

  let soma = 0;
  for (let i = 0; i < TAMANHO_ISBN13; i += 1) {
    // charCodeAt evita acesso indexado em objeto; a regex acima ja garantiu
    // que todo caractere e um digito.
    const digito = isbn.charCodeAt(i) - ZERO_ASCII;
    soma += i % 2 === 0 ? digito : digito * 3;
  }

  return soma % 10 === 0;
}
