import { describe, it, expect } from 'vitest';
import { validateCedula } from '../../src/validators/cedula.js';

describe('validateCedula', () => {
  describe('cédulas válidas', () => {
    it('valida cédula 00112345673', () => {
      const result = validateCedula('00112345673');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('001-1234567-3');
    });

    it('valida una cédula con guiones', () => {
      const result = validateCedula('001-1234567-3');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('001-1234567-3');
    });

    it('valida cédula 40223456787', () => {
      const result = validateCedula('40223456787');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('402-2345678-7');
    });

    it('valida cédula 00100123454', () => {
      const result = validateCedula('00100123454');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('001-0012345-4');
    });

    it('valida cédula 40212345678', () => {
      const result = validateCedula('40212345678');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('402-1234567-8');
    });

    it('valida cédula 22300262700', () => {
      const result = validateCedula('22300262700');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('223-0026270-0');
    });
  });

  describe('cédulas inválidas', () => {
    it('rechaza un string vacío', () => {
      expect(validateCedula('').valid).toBe(false);
    });

    it('rechaza una cédula con menos de 11 dígitos', () => {
      expect(validateCedula('0011234567').valid).toBe(false);
    });

    it('rechaza una cédula con más de 11 dígitos', () => {
      expect(validateCedula('001123456730').valid).toBe(false);
    });

    it('rechaza una cédula con dígito verificador incorrecto', () => {
      expect(validateCedula('00112345674').valid).toBe(false);
    });

    it('rechaza letras', () => {
      expect(validateCedula('ABCDEFGHIJK').valid).toBe(false);
    });

    it('rechaza prefijo 000', () => {
      expect(validateCedula('00012345678').valid).toBe(false);
    });
  });

  describe('formato', () => {
    it('retorna formatted como undefined cuando es inválido', () => {
      const result = validateCedula('00012345678');
      expect(result.formatted).toBeUndefined();
    });

    it('el formato sigue el patrón XXX-XXXXXXX-X', () => {
      const result = validateCedula('00112345673');
      expect(result.formatted).toMatch(/^\d{3}-\d{7}-\d$/);
    });
  });
});
