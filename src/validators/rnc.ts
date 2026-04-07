import type { ValidationResult } from '../types/index.js';
import { stripNonDigits } from '../utils/index.js';
import { RNC_WHITELIST } from './rnc-whitelist.js';

const WEIGHTS = [7, 9, 8, 6, 5, 4, 3, 2] as const;

/**
 * Valida un RNC (Registro Nacional de Contribuyentes) dominicano.
 *
 * El RNC tiene 9 dígitos y usa un algoritmo de dígito verificador
 * basado en módulo 11 con pesos [7, 9, 8, 6, 5, 4, 3, 2].
 *
 * @param value - RNC a validar (con o sin guiones)
 * @returns Resultado con validez y formato X-XX-XXXXX-X
 */
export function validateRnc(value: string): ValidationResult {
  if (typeof value !== 'string') return { valid: false };

  const digits = stripNonDigits(value);

  if (RNC_WHITELIST.has(digits)) {
    if (digits.length === 9) {
      const formatted = `${digits[0]}-${digits.slice(1, 3)}-${digits.slice(3, 8)}-${digits[8]}`;
      return { valid: true, formatted };
    }
    return { valid: true, formatted: digits };
  }

  if (digits.length !== 9) {
    return { valid: false };
  }

  if (digits[0] === '0') {
    return { valid: false };
  }

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += Number(digits[i]) * WEIGHTS[i]!;
  }

  const remainder = sum % 11;
  let expectedCheckDigit: number;

  if (remainder === 0) {
    expectedCheckDigit = 2;
  } else if (remainder === 1) {
    expectedCheckDigit = 1;
  } else {
    expectedCheckDigit = 11 - remainder;
  }

  const actualCheckDigit = Number(digits[8]);

  if (actualCheckDigit !== expectedCheckDigit) {
    return { valid: false };
  }

  const formatted = `${digits[0]}-${digits.slice(1, 3)}-${digits.slice(3, 8)}-${digits[8]}`;

  return { valid: true, formatted };
}
