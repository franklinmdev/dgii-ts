import type { ValidationResult } from '../types/index.js';
import { stripNonDigits } from '../utils/index.js';

/**
 * Valida una cédula de identidad dominicana.
 *
 * La cédula tiene 11 dígitos y usa el algoritmo de Luhn (módulo 10)
 * con pesos alternados [1, 2].
 *
 * @param value - Cédula a validar (con o sin guiones)
 * @returns Resultado con validez y formato XXX-XXXXXXX-X
 */
export function validateCedula(value: string): ValidationResult {
  const digits = stripNonDigits(value);

  if (digits.length !== 11) {
    return { valid: false };
  }

  if (digits.slice(0, 3) === '000') {
    return { valid: false };
  }

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const weight = i % 2 === 0 ? 1 : 2;
    let product = Number(digits[i]) * weight;

    if (product >= 10) {
      product -= 9;
    }

    sum += product;
  }

  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  const actualCheckDigit = Number(digits[10]);

  if (actualCheckDigit !== expectedCheckDigit) {
    return { valid: false };
  }

  const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits[10]}`;

  return { valid: true, formatted };
}
