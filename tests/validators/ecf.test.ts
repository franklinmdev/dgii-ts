import { describe, it, expect } from 'vitest';
import { validateEcf } from '../../src/validators/ecf.js';

describe('validateEcf', () => {
  describe('e-NCF válidos', () => {
    it('valida E31 - factura de crédito fiscal electrónica', () => {
      const result = validateEcf('E310000000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('CREDITO_FISCAL_ELECTRONICA');
      expect(result.serie).toBe('E31');
    });

    it('valida E32 - factura de consumo electrónica', () => {
      const result = validateEcf('E320000000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('CONSUMO_ELECTRONICA');
      expect(result.serie).toBe('E32');
    });

    it('valida E33 - nota de débito electrónica', () => {
      const result = validateEcf('E330000000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('NOTA_DE_DEBITO_ELECTRONICA');
      expect(result.serie).toBe('E33');
    });

    it('valida E34 - nota de crédito electrónica', () => {
      const result = validateEcf('E340000000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('NOTA_DE_CREDITO_ELECTRONICA');
      expect(result.serie).toBe('E34');
    });

    it('valida E41 - comprobante electrónico de compras', () => {
      const result = validateEcf('E410000000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('COMPRAS_ELECTRONICO');
      expect(result.serie).toBe('E41');
    });

    it('valida E43 - gastos menores electrónico', () => {
      const result = validateEcf('E430000000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('GASTOS_MENORES_ELECTRONICO');
      expect(result.serie).toBe('E43');
    });

    it('valida E44 - regímenes especiales electrónico', () => {
      const result = validateEcf('E440000000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('REGIMENES_ESPECIALES_ELECTRONICO');
      expect(result.serie).toBe('E44');
    });

    it('valida E45 - gubernamental electrónico', () => {
      const result = validateEcf('E450000000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('GUBERNAMENTAL_ELECTRONICO');
      expect(result.serie).toBe('E45');
    });

    it('valida E46 - exportaciones electrónico', () => {
      const result = validateEcf('E460000000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('EXPORTACIONES_ELECTRONICO');
      expect(result.serie).toBe('E46');
    });

    it('valida E47 - pagos al exterior electrónico', () => {
      const result = validateEcf('E470000000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('PAGOS_AL_EXTERIOR_ELECTRONICO');
      expect(result.serie).toBe('E47');
    });

    it('acepta minúsculas', () => {
      const result = validateEcf('e310000000001');
      expect(result.valid).toBe(true);
    });

    it('acepta espacios al inicio/final', () => {
      const result = validateEcf('  E310000000001  ');
      expect(result.valid).toBe(true);
    });

    it('valida secuencia con dígitos variados', () => {
      const result = validateEcf('E311234567890');
      expect(result.valid).toBe(true);
      expect(result.serie).toBe('E31');
    });
  });

  describe('e-NCF inválidos', () => {
    it('rechaza un string vacío', () => {
      expect(validateEcf('').valid).toBe(false);
    });

    it('rechaza un e-NCF sin prefijo E', () => {
      expect(validateEcf('310000000001').valid).toBe(false);
    });

    it('rechaza prefijo B (eso es NCF tradicional)', () => {
      expect(validateEcf('B0100000001').valid).toBe(false);
    });

    it('rechaza un tipo inexistente (E35)', () => {
      expect(validateEcf('E350000000001').valid).toBe(false);
    });

    it('rechaza un tipo inexistente (E42)', () => {
      expect(validateEcf('E420000000001').valid).toBe(false);
    });

    it('rechaza secuencia demasiado corta (9 dígitos)', () => {
      expect(validateEcf('E31000000001').valid).toBe(false);
    });

    it('rechaza secuencia demasiado larga (11 dígitos)', () => {
      expect(validateEcf('E3100000000001').valid).toBe(false);
    });

    it('rechaza caracteres no numéricos en secuencia', () => {
      expect(validateEcf('E31ABCDEFGHIJ').valid).toBe(false);
    });
  });

  describe('type guard', () => {
    it('retorna { valid: false } para input no-string', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((validateEcf as any)(123)).toEqual({ valid: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((validateEcf as any)(null)).toEqual({ valid: false });
    });
  });

  describe('resultado', () => {
    it('retorna type y serie como undefined cuando es inválido', () => {
      const result = validateEcf('INVALIDO');
      expect(result.type).toBeUndefined();
      expect(result.serie).toBeUndefined();
    });
  });
});
