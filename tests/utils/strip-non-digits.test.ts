import { describe, it, expect } from 'vitest';
import { stripNonDigits } from '../../src/utils/index.js';

describe('stripNonDigits', () => {
  it('retorna string vacío para input vacío', () => {
    expect(stripNonDigits('')).toBe('');
  });

  it('retorna string vacío para input sin dígitos', () => {
    expect(stripNonDigits('abc-xyz')).toBe('');
  });

  it('elimina guiones y espacios', () => {
    expect(stripNonDigits('001-1234567-3')).toBe('00112345673');
  });

  it('elimina puntos y barras', () => {
    expect(stripNonDigits('1.31/098.19-3')).toBe('131098193');
  });

  it('elimina caracteres Unicode no-ASCII', () => {
    expect(stripNonDigits('١٢٣abc456')).toBe('456');
  });

  it('retorna sin cambios un string puramente numérico', () => {
    expect(stripNonDigits('123456789')).toBe('123456789');
  });
});
