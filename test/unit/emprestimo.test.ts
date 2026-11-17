import { describe, expect, it } from 'vitest';
import {
  LIMITE_EMPRESTIMOS_ATIVOS,
  MULTA_MAXIMA,
  PRAZO_DIAS,
  calcularDataPrevista,
  calcularMulta,
  diasDeAtraso,
  podeEmprestar,
} from '../../src/domain/emprestimo';

const em = (iso: string): Date => new Date(iso);

describe('calcularDataPrevista', () => {
  it(`soma ${PRAZO_DIAS} dias a data do emprestimo`, () => {
    expect(calcularDataPrevista(em('2026-03-01T10:00:00Z')).toISOString()).toBe(
      '2026-03-15T10:00:00.000Z',
    );
  });

  it('atravessa a virada de mes corretamente', () => {
    expect(calcularDataPrevista(em('2026-01-25T00:00:00Z')).toISOString()).toBe(
      '2026-02-08T00:00:00.000Z',
    );
  });

  it('respeita ano bissexto', () => {
    // 2028 e bissexto: fevereiro tem 29 dias.
    expect(calcularDataPrevista(em('2028-02-20T00:00:00Z')).toISOString()).toBe(
      '2028-03-05T00:00:00.000Z',
    );
  });
});

describe('diasDeAtraso', () => {
  it('e zero quando devolve antes do prazo', () => {
    expect(diasDeAtraso(em('2026-03-15T00:00:00Z'), em('2026-03-10T00:00:00Z'))).toBe(0);
  });

  it('e zero no proprio dia do vencimento, mesmo mais tarde', () => {
    expect(diasDeAtraso(em('2026-03-15T08:00:00Z'), em('2026-03-15T23:59:00Z'))).toBe(0);
  });

  it('conta dias inteiros de atraso', () => {
    expect(diasDeAtraso(em('2026-03-15T00:00:00Z'), em('2026-03-18T00:00:00Z'))).toBe(3);
  });
});

describe('calcularMulta', () => {
  it('nao cobra quando a devolucao esta no prazo', () => {
    expect(calcularMulta(em('2026-03-15T00:00:00Z'), em('2026-03-15T20:00:00Z'))).toBe(0);
    expect(calcularMulta(em('2026-03-15T00:00:00Z'), em('2026-03-01T00:00:00Z'))).toBe(0);
  });

  it('cobra por dia de atraso', () => {
    expect(calcularMulta(em('2026-03-15T00:00:00Z'), em('2026-03-16T00:00:00Z'))).toBe(
      1.5,
    );
    expect(calcularMulta(em('2026-03-15T00:00:00Z'), em('2026-03-19T00:00:00Z'))).toBe(6);
  });

  it(`nunca ultrapassa o teto de ${MULTA_MAXIMA}`, () => {
    expect(calcularMulta(em('2026-03-15T00:00:00Z'), em('2026-05-15T00:00:00Z'))).toBe(
      MULTA_MAXIMA,
    );
  });

  it('devolve valor com no maximo duas casas decimais', () => {
    const multa = calcularMulta(em('2026-03-15T00:00:00Z'), em('2026-03-18T00:00:00Z'));
    expect(multa).toBe(4.5);
    expect(Number.isInteger(multa * 100)).toBe(true);
  });
});

describe('podeEmprestar', () => {
  it('permite ate o limite', () => {
    expect(podeEmprestar(0)).toBe(true);
    expect(podeEmprestar(LIMITE_EMPRESTIMOS_ATIVOS - 1)).toBe(true);
  });

  it('bloqueia a partir do limite', () => {
    expect(podeEmprestar(LIMITE_EMPRESTIMOS_ATIVOS)).toBe(false);
    expect(podeEmprestar(LIMITE_EMPRESTIMOS_ATIVOS + 1)).toBe(false);
  });
});
