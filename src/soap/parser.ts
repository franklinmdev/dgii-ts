import type { Contribuyente, NcfQueryResult } from '../types/index.js';
import { extractTagContent } from './xml.js';
import { DgiiNotFoundError, DgiiServiceError } from '../errors/index.js';
import { collapseSpaces, stripNonDigits } from '../utils/index.js';

/**
 * Escapa caracteres de control literales en un string JSON de la DGII.
 * La DGII puede retornar nombres con \n y \t literales que rompen
 * JSON.parse.
 */
function sanitizeJson(raw: string): string {
  return raw
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
}

/**
 * Extrae y parsea la respuesta de GetContribuyentes.
 *
 * @throws {DgiiNotFoundError} si el RNC/cédula no existe
 * @throws {DgiiServiceError} si la respuesta no tiene el formato esperado
 */
export function parseContribuyenteResponse(
  responseXml: string,
): Contribuyente {
  const raw = extractTagContent(responseXml, 'GetContribuyentesResult');

  if (raw === undefined) {
    throw new DgiiServiceError(
      'Respuesta SOAP sin GetContribuyentesResult',
    );
  }

  const trimmed = raw.trim();

  if (trimmed === '0' || trimmed === '') {
    throw new DgiiNotFoundError(
      'RNC o cédula no encontrado en el registro de la DGII',
    );
  }

  // La DGII concatena múltiples resultados con @@@
  // Para consulta individual tomamos solo el primer resultado
  const firstResult = trimmed.split('@@@')[0]!;
  const sanitized = sanitizeJson(firstResult);

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    throw new DgiiServiceError(
      'Respuesta de la DGII no es JSON válido',
    );
  }

  // Validación de forma en runtime (la respuesta de la DGII es data no confiable)
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>)['RGE_RUC'] !== 'string'
  ) {
    throw new DgiiServiceError(
      'Formato de respuesta de la DGII inesperado',
    );
  }

  const data = parsed as Record<string, unknown>;

  return {
    rnc: stripNonDigits(String(data['RGE_RUC'] ?? '')),
    nombre: collapseSpaces(String(data['RGE_NOMBRE'] ?? '')),
    nombreComercial: collapseSpaces(String(data['NOMBRE_COMERCIAL'] ?? '')),
    estado: String(data['ESTATUS'] ?? '') === '2' ? 'ACTIVO' : 'INACTIVO',
    categoria: String(data['CATEGORIA'] ?? ''),
  };
}

/**
 * Extrae y parsea la respuesta de GetNCF.
 *
 * @throws {DgiiServiceError} si la respuesta no tiene el formato esperado
 */
export function parseNcfResponse(responseXml: string): NcfQueryResult {
  const raw = extractTagContent(responseXml, 'GetNCFResult');

  if (raw === undefined) {
    throw new DgiiServiceError('Respuesta SOAP sin GetNCFResult');
  }

  const trimmed = raw.trim();

  if (trimmed === '0' || trimmed === '') {
    // GetNCF retorna "0" cuando la combinación es inválida
    // Esto NO es un error de no-encontrado -- significa que el NCF no es válido
    return { valid: false, rnc: '', ncf: '', nombreComercial: undefined };
  }

  const sanitized = sanitizeJson(trimmed);

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    throw new DgiiServiceError(
      'Respuesta de la DGII no es JSON válido',
    );
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new DgiiServiceError(
      'Formato de respuesta de la DGII inesperado',
    );
  }

  const data = parsed as Record<string, unknown>;
  const esValido = Boolean(data['ES_VALIDO']);

  return {
    valid: esValido,
    rnc: String(data['RNC'] ?? ''),
    ncf: String(data['NCF'] ?? ''),
    nombreComercial: data['NOMBRE_COMERCIAL']
      ? collapseSpaces(String(data['NOMBRE_COMERCIAL']))
      : undefined,
  };
}
