import { describe, it, expect } from 'vitest';
import { validateCedula } from '../../src/validators/cedula.js';
import { CEDULA_WHITELIST } from '../../src/validators/cedula-whitelist.js';

describe('cedula whitelist', () => {
  it('la whitelist tiene exactamente 578 entradas', () => {
    expect(CEDULA_WHITELIST.size).toBe(578);
  });

  it('cédulas whitelisted pasan validación', () => {
    const samples = ['00000021249', '00100000169', '40200401324'];
    for (const cedula of samples) {
      expect(validateCedula(cedula).valid).toBe(true);
    }
  });

  it('cédulas con prefijo 000 en whitelist pasan validación', () => {
    const result = validateCedula('00000021249');
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe('000-0002124-9');
  });

  it('entradas de 10 dígitos en whitelist pasan validación', () => {
    const result = validateCedula('0094662667');
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe('0094662667');
  });

  it('entradas de 10 dígitos: 0710208838', () => {
    const result = validateCedula('0710208838');
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe('0710208838');
  });
});
