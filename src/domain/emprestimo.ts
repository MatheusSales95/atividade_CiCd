/**
 * Regras de negocio do emprestimo.
 *
 * Ficam isoladas de banco e de HTTP de proposito: sao funcoes puras, o que as
 * torna o alvo natural dos testes unitarios.
 */

/** Prazo padrao de emprestimo, em dias corridos. */
export const PRAZO_DIAS = 14;

/** Valor cobrado por dia de atraso, em reais. */
export const MULTA_POR_DIA = 1.5;

/** Teto da multa, em reais: o atraso nao pode gerar divida ilimitada. */
export const MULTA_MAXIMA = 30;

/** Quantidade maxima de emprestimos simultaneos por membro. */
export const LIMITE_EMPRESTIMOS_ATIVOS = 3;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Zera a hora para que a comparacao seja por dia, e nao por instante. */
function inicioDoDiaUtc(data: Date): number {
  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

export function calcularDataPrevista(dataEmprestimo: Date): Date {
  const previsto = new Date(dataEmprestimo.getTime());
  previsto.setUTCDate(previsto.getUTCDate() + PRAZO_DIAS);
  return previsto;
}

export function diasDeAtraso(dataPrevista: Date, dataDevolucao: Date): number {
  const diferenca = inicioDoDiaUtc(dataDevolucao) - inicioDoDiaUtc(dataPrevista);
  if (diferenca <= 0) return 0;
  return Math.floor(diferenca / MS_POR_DIA);
}

/**
 * Devolver no proprio dia do vencimento nao gera multa; a cobranca comeca no dia
 * seguinte e para ao atingir o teto.
 */
export function calcularMulta(dataPrevista: Date, dataDevolucao: Date): number {
  const atraso = diasDeAtraso(dataPrevista, dataDevolucao);
  if (atraso === 0) return 0;

  const bruto = atraso * MULTA_POR_DIA;
  const multa = Math.min(bruto, MULTA_MAXIMA);

  // Duas casas decimais: o valor representa dinheiro.
  return Math.round(multa * 100) / 100;
}

export function podeEmprestar(emprestimosAtivos: number): boolean {
  return emprestimosAtivos < LIMITE_EMPRESTIMOS_ATIVOS;
}
