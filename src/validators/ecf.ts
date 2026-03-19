import type { NcfValidationResult } from '../types/index.js';

/**
 * Tipos de comprobantes fiscales electrónicos e-NCF (serie E) según la DGII.
 */
const ECF_TYPES: Readonly<Record<string, string>> = /*#__PURE__*/ Object.freeze({
  '31': 'CREDITO_FISCAL_ELECTRONICA',
  '32': 'CONSUMO_ELECTRONICA',
  '33': 'NOTA_DE_DEBITO_ELECTRONICA',
  '34': 'NOTA_DE_CREDITO_ELECTRONICA',
  '41': 'COMPRAS_ELECTRONICO',
  '43': 'GASTOS_MENORES_ELECTRONICO',
  '44': 'REGIMENES_ESPECIALES_ELECTRONICO',
  '45': 'GUBERNAMENTAL_ELECTRONICO',
  '46': 'EXPORTACIONES_ELECTRONICO',
  '47': 'PAGOS_AL_EXTERIOR_ELECTRONICO',
});

/**
 * Nombres legibles de cada tipo de e-NCF.
 */
export const ECF_TYPE_NAMES: Readonly<Record<string, string>> =
  /*#__PURE__*/ Object.freeze({
    '31': 'Factura de crédito fiscal electrónica',
    '32': 'Factura de consumo electrónica',
    '33': 'Nota de débito electrónica',
    '34': 'Nota de crédito electrónica',
    '41': 'Comprobante electrónico de compras',
    '43': 'Comprobante electrónico para gastos menores',
    '44': 'Comprobante electrónico para regímenes especiales',
    '45': 'Comprobante electrónico gubernamental',
    '46': 'Comprobante electrónico para exportaciones',
    '47': 'Comprobante electrónico para pagos al exterior',
  });

const ECF_PATTERN = /^E(\d{2})(\d{10})$/;

/**
 * Valida un e-NCF (comprobante fiscal electrónico) dominicano.
 *
 * Formato: E + 2 dígitos (tipo) + 10 dígitos (secuencial) = 13 caracteres.
 * Ejemplo: E310000000001
 *
 * @param value - e-NCF a validar
 * @returns Resultado con validez, tipo y serie
 */
export function validateEcf(value: string): NcfValidationResult {
  if (typeof value !== 'string') return { valid: false };

  const normalized = value.toUpperCase().trim();
  const match = ECF_PATTERN.exec(normalized);

  if (!match) {
    return { valid: false };
  }

  const typeCode = match[1]!;
  const type = ECF_TYPES[typeCode];

  if (!type) {
    return { valid: false };
  }

  return {
    valid: true,
    type,
    serie: `E${typeCode}`,
  };
}
