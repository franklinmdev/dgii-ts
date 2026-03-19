import { describe, it, expect } from 'vitest';
import { validateRnc } from '../../src/validators/rnc.js';
import { RNC_WHITELIST } from '../../src/validators/rnc-whitelist.js';

describe('RNC whitelist', () => {
  it('la whitelist tiene exactamente 23 entradas', () => {
    expect(RNC_WHITELIST.size).toBe(23);
  });

  it('RNCs whitelisted pasan validación', () => {
    const samples = ['101581601', '131188691', '505038691'];
    for (const rnc of samples) {
      expect(validateRnc(rnc).valid).toBe(true);
    }
  });

  it('RNC de 8 dígitos en whitelist pasa validación', () => {
    const result = validateRnc('10233317');
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe('10233317');
  });

  it('RNC 000000002 es rechazado', () => {
    expect(validateRnc('000000002').valid).toBe(false);
  });
});
