import type { NcfValidationResult } from '../types/index.js';

/**
 * Tipos de comprobantes fiscales NCF (serie B) según la DGII.
 */
const NCF_TYPES: Record<string, string> = {
  '01': 'CREDITO_FISCAL',
  '02': 'CONSUMO',
  '03': 'NOTA_DE_DEBITO',
  '04': 'NOTA_DE_CREDITO',
  '11': 'COMPRAS',
  '12': 'REGISTRO_UNICO_DE_INGRESOS',
  '13': 'GASTOS_MENORES',
  '14': 'REGIMENES_ESPECIALES',
  '15': 'GUBERNAMENTAL',
  '16': 'EXPORTACIONES',
  '17': 'PAGOS_AL_EXTERIOR',
};

/**
 * Nombres legibles de cada tipo de NCF.
 */
export const NCF_TYPE_NAMES: Record<string, string> = {
  '01': 'Factura de crédito fiscal',
  '02': 'Factura de consumo',
  '03': 'Nota de débito',
  '04': 'Nota de crédito',
  '11': 'Comprobante de compras',
  '12': 'Registro único de ingresos',
  '13': 'Comprobante para gastos menores',
  '14': 'Comprobante para regímenes especiales',
  '15': 'Comprobante gubernamental',
  '16': 'Comprobante para exportaciones',
  '17': 'Comprobante para pagos al exterior',
};

const NCF_PATTERN = /^B(\d{2})(\d{8})$/;

/**
 * Valida un NCF (Número de Comprobante Fiscal) dominicano.
 *
 * Formato: B + 2 dígitos (tipo) + 8 dígitos (secuencial) = 11 caracteres.
 * Ejemplo: B0100000001
 *
 * @param value - NCF a validar
 * @returns Resultado con validez, tipo y serie
 */
export function validateNcf(value: string): NcfValidationResult {
  const normalized = value.toUpperCase().trim();
  const match = NCF_PATTERN.exec(normalized);

  if (!match) {
    return { valid: false };
  }

  const typeCode = match[1]!;
  const type = NCF_TYPES[typeCode];

  if (!type) {
    return { valid: false };
  }

  return {
    valid: true,
    type,
    serie: `B${typeCode}`,
  };
}
