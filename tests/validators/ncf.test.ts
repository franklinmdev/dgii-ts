import { describe, it, expect } from 'vitest';
import { validateNcf } from '../../src/validators/ncf.js';

describe('validateNcf', () => {
  describe('NCF válidos', () => {
    it('valida B01 - factura de crédito fiscal', () => {
      const result = validateNcf('B0100000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('CREDITO_FISCAL');
      expect(result.serie).toBe('B01');
    });

    it('valida B02 - factura de consumo', () => {
      const result = validateNcf('B0200000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('CONSUMO');
      expect(result.serie).toBe('B02');
    });

    it('valida B03 - nota de débito', () => {
      const result = validateNcf('B0300000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('NOTA_DE_DEBITO');
      expect(result.serie).toBe('B03');
    });

    it('valida B04 - nota de crédito', () => {
      const result = validateNcf('B0400000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('NOTA_DE_CREDITO');
      expect(result.serie).toBe('B04');
    });

    it('valida B11 - comprobante de compras', () => {
      const result = validateNcf('B1100000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('COMPRAS');
      expect(result.serie).toBe('B11');
    });

    it('valida B12 - registro único de ingresos', () => {
      const result = validateNcf('B1200000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('REGISTRO_UNICO_DE_INGRESOS');
      expect(result.serie).toBe('B12');
    });

    it('valida B13 - gastos menores', () => {
      const result = validateNcf('B1300000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('GASTOS_MENORES');
      expect(result.serie).toBe('B13');
    });

    it('valida B14 - regímenes especiales', () => {
      const result = validateNcf('B1400000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('REGIMENES_ESPECIALES');
      expect(result.serie).toBe('B14');
    });

    it('valida B15 - gubernamental', () => {
      const result = validateNcf('B1500000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('GUBERNAMENTAL');
      expect(result.serie).toBe('B15');
    });

    it('valida B16 - exportaciones', () => {
      const result = validateNcf('B1600000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('EXPORTACIONES');
      expect(result.serie).toBe('B16');
    });

    it('valida B17 - pagos al exterior', () => {
      const result = validateNcf('B1700000001');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('PAGOS_AL_EXTERIOR');
      expect(result.serie).toBe('B17');
    });

    it('acepta minúsculas', () => {
      const result = validateNcf('b0100000001');
      expect(result.valid).toBe(true);
    });

    it('acepta espacios al inicio/final', () => {
      const result = validateNcf('  B0100000001  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('NCF inválidos', () => {
    it('rechaza un string vacío', () => {
      expect(validateNcf('').valid).toBe(false);
    });

    it('rechaza un NCF sin prefijo B', () => {
      expect(validateNcf('0100000001').valid).toBe(false);
    });

    it('rechaza un tipo inexistente (B05)', () => {
      expect(validateNcf('B0500000001').valid).toBe(false);
    });

    it('rechaza un tipo inexistente (B10)', () => {
      expect(validateNcf('B1000000001').valid).toBe(false);
    });

    it('rechaza secuencia demasiado corta', () => {
      expect(validateNcf('B010000001').valid).toBe(false);
    });

    it('rechaza secuencia demasiado larga', () => {
      expect(validateNcf('B01000000001').valid).toBe(false);
    });

    it('rechaza prefijo E (eso es e-NCF)', () => {
      expect(validateNcf('E310000000001').valid).toBe(false);
    });

    it('rechaza caracteres no numéricos en secuencia', () => {
      expect(validateNcf('B01ABCDEFGH').valid).toBe(false);
    });
  });

  describe('type guard', () => {
    it('retorna { valid: false } para input no-string', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((validateNcf as any)(123)).toEqual({ valid: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((validateNcf as any)(null)).toEqual({ valid: false });
    });
  });

  describe('resultado', () => {
    it('retorna type y serie como undefined cuando es inválido', () => {
      const result = validateNcf('INVALIDO');
      expect(result.type).toBeUndefined();
      expect(result.serie).toBeUndefined();
    });
  });
});
