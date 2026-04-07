import { describe, it, expect } from 'vitest';
import { validateRnc } from '../../src/validators/rnc.js';

describe('validateRnc', () => {
  describe('RNC válidos', () => {
    it('valida RNC 131098193', () => {
      const result = validateRnc('131098193');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('1-31-09819-3');
    });

    it('valida un RNC con guiones', () => {
      const result = validateRnc('1-31-09819-3');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('1-31-09819-3');
    });

    it('valida un RNC con espacios', () => {
      const result = validateRnc('1 31 09819 3');
      expect(result.valid).toBe(true);
    });

    it('valida RNC 101007151', () => {
      const result = validateRnc('101007151');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('1-01-00715-1');
    });

    it('valida RNC 130692092', () => {
      const result = validateRnc('130692092');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('1-30-69209-2');
    });

    it('valida RNC 501058344', () => {
      const result = validateRnc('501058344');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('5-01-05834-4');
    });

    it('valida RNC 123456786', () => {
      const result = validateRnc('123456786');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('1-23-45678-6');
    });
  });

  describe('RNC inválidos', () => {
    it('rechaza un string vacío', () => {
      expect(validateRnc('').valid).toBe(false);
    });

    it('rechaza un RNC con menos de 9 dígitos', () => {
      expect(validateRnc('12345678').valid).toBe(false);
    });

    it('rechaza un RNC con más de 9 dígitos', () => {
      expect(validateRnc('1234567890').valid).toBe(false);
    });

    it('rechaza un RNC con dígito verificador incorrecto', () => {
      expect(validateRnc('131098190').valid).toBe(false);
    });

    it('rechaza letras', () => {
      expect(validateRnc('ABCDEFGHI').valid).toBe(false);
    });

    it('rechaza todos ceros', () => {
      expect(validateRnc('000000000').valid).toBe(false);
    });

    it('retorna { valid: false } para input no-string', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((validateRnc as any)(123)).toEqual({ valid: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((validateRnc as any)(null)).toEqual({ valid: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((validateRnc as any)(undefined)).toEqual({ valid: false });
    });

    it('rechaza RNC 000000002 (bug fix)', () => {
      expect(validateRnc('000000002').valid).toBe(false);
    });

    it('rechaza RNC que empieza con 0', () => {
      expect(validateRnc('012345678').valid).toBe(false);
    });
  });

  describe('formato', () => {
    it('retorna formatted como undefined cuando es inválido', () => {
      const result = validateRnc('000000000');
      expect(result.formatted).toBeUndefined();
    });

    it('el formato sigue el patrón X-XX-XXXXX-X', () => {
      const result = validateRnc('131098193');
      expect(result.formatted).toMatch(/^\d-\d{2}-\d{5}-\d$/);
    });
  });
});
