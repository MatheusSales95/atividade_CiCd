import { describe, expect, it } from 'vitest';
import { isbnValido, normalizarIsbn } from '../../src/domain/isbn';

describe('normalizarIsbn', () => {
  it('remove hifens e espacos', () => {
    expect(normalizarIsbn('978-85-333-0227-3')).toBe('9788533302273');
    expect(normalizarIsbn(' 978 0306 406157 ')).toBe('9780306406157');
  });
});

describe('isbnValido', () => {
  it('aceita ISBN-13 com digito verificador correto', () => {
    expect(isbnValido('9788533302273')).toBe(true);
    expect(isbnValido('9780306406157')).toBe(true);
    expect(isbnValido('9788535902778')).toBe(true);
  });

  it('aceita ISBN formatado com hifens', () => {
    expect(isbnValido('978-85-333-0227-3')).toBe(true);
  });

  it('rejeita quando o digito verificador nao fecha', () => {
    expect(isbnValido('9780306406158')).toBe(false);
    expect(isbnValido('9788533302274')).toBe(false);
  });

  it('rejeita tamanho diferente de 13', () => {
    expect(isbnValido('978030640615')).toBe(false);
    expect(isbnValido('97803064061570')).toBe(false);
    expect(isbnValido('')).toBe(false);
  });

  it('rejeita caracteres nao numericos', () => {
    expect(isbnValido('97803064061X7')).toBe(false);
    expect(isbnValido('abcdefghijklm')).toBe(false);
  });
});
