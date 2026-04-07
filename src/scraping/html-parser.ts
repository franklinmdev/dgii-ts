import type { Contribuyente, NcfQueryResult } from '../types/index.js';
import { DgiiNotFoundError, DgiiServiceError } from '../errors/index.js';
import { collapseSpaces, stripNonDigits } from '../utils/index.js';

/**
 * Resultado de la extracción de tokens ViewState de una página
 * ASP.NET WebForms.
 */
export interface ViewStateTokens {
  viewState: string;
  viewStateGenerator: string;
  eventValidation: string;
}

/**
 * Extrae los tokens __VIEWSTATE, __VIEWSTATEGENERATOR y
 * __EVENTVALIDATION del HTML de una página ASP.NET.
 */
export function extractViewStateTokens(html: string): ViewStateTokens {
  const viewState = extractInputValue(html, '__VIEWSTATE');
  const viewStateGenerator =
    extractInputValue(html, '__VIEWSTATEGENERATOR');
  const eventValidation =
    extractInputValue(html, '__EVENTVALIDATION');

  if (!viewState || !eventValidation) {
    throw new DgiiServiceError(
      'No se encontraron tokens ViewState en la página de la DGII',
    );
  }

  return { viewState, viewStateGenerator, eventValidation };
}

/**
 * Parsea el HTML de respuesta de la consulta RNC y extrae los
 * datos del contribuyente.
 *
 * @throws {DgiiNotFoundError} si el RNC no existe
 * @throws {DgiiServiceError} si el HTML no tiene el formato esperado
 */
export function parseContribuyenteHtml(html: string): Contribuyente {
  // Detectar "no se encuentra"
  const infoStart = html.indexOf('cphMain_lblInformacion');
  if (infoStart !== -1) {
    const infoEnd = html.indexOf('</span>', infoStart);
    if (infoEnd !== -1) {
      const infoBlock = html.slice(infoStart, infoEnd);
      if (infoBlock.includes('no se encuentra')) {
        throw new DgiiNotFoundError(
          'RNC o cédula no encontrado en el registro de la DGII',
        );
      }
    }
  }

  // Buscar la tabla de resultados
  const tableId = 'cphMain_dvDatosContribuyentes';
  const tableStart = html.indexOf(tableId);
  if (tableStart === -1) {
    throw new DgiiServiceError(
      'Formato de respuesta HTML inesperado: tabla de resultados no encontrada',
    );
  }

  // Extraer pares label/valor del HTML
  const tableEnd = html.indexOf('</table>', tableStart);
  if (tableEnd === -1) {
    throw new DgiiServiceError(
      'Formato de respuesta HTML inesperado: tabla incompleta',
    );
  }

  const tableHtml = html.slice(tableStart, tableEnd);
  const fields = extractTableFields(tableHtml);

  const rnc = fields.get('Cedula/RNC')
    ?? fields.get('RNC')
    ?? '';
  const nombre = fields.get('Nombre/Razon Social')
    ?? fields.get('Nombre / Razon Social')
    ?? '';
  const nombreComercial = fields.get('Nombre Comercial') ?? '';
  const categoria = fields.get('Categoria') ?? '';
  const rawEstado = fields.get('Estado') ?? '';
  const actividadEconomica =
    fields.get('Actividad Economica') ?? undefined;
  const regimenDePagos =
    fields.get('Regimen de pagos') ?? undefined;
  const administracionLocal =
    fields.get('Administracion Local') ?? undefined;

  return {
    rnc: stripNonDigits(rnc),
    nombre: collapseSpaces(nombre),
    nombreComercial: collapseSpaces(nombreComercial),
    estado: rawEstado.toUpperCase().includes('ACTIVO')
      ? 'ACTIVO'
      : 'INACTIVO',
    categoria: collapseSpaces(categoria),
    actividadEconomica: actividadEconomica
      ? collapseSpaces(actividadEconomica)
      : undefined,
    regimenDePagos: regimenDePagos
      ? collapseSpaces(regimenDePagos)
      : undefined,
    administracionLocal: administracionLocal
      ? collapseSpaces(administracionLocal)
      : undefined,
  };
}

/**
 * Parsea el HTML de respuesta de la consulta NCF.
 */
export function parseNcfHtml(html: string): NcfQueryResult {
  // Detectar mensajes de error o "no válido"
  const infoStart = html.indexOf('cphMain_lblInformacion');
  if (infoStart !== -1) {
    const infoEnd = html.indexOf('</span>', infoStart);
    if (infoEnd !== -1) {
      const infoBlock = html.slice(infoStart, infoEnd);
      if (
        infoBlock.includes('no es v') ||
        infoBlock.includes('no se encuentra') ||
        infoBlock.includes('no existe')
      ) {
        return { valid: false, rnc: '', ncf: '', nombreComercial: undefined };
      }
    }
  }

  // Buscar tabla de resultados NCF
  const tableId = 'cphMain_dvDatosComprobante';
  const altTableId = 'cphMain_dvDatosContribuyentes';
  let tableStart = html.indexOf(tableId);
  if (tableStart === -1) {
    tableStart = html.indexOf(altTableId);
  }
  if (tableStart === -1) {
    // Sin tabla de resultados = NCF no válido
    return { valid: false, rnc: '', ncf: '', nombreComercial: undefined };
  }

  const tableEnd = html.indexOf('</table>', tableStart);
  if (tableEnd === -1) {
    return { valid: false, rnc: '', ncf: '', nombreComercial: undefined };
  }

  const tableHtml = html.slice(tableStart, tableEnd);
  const fields = extractTableFields(tableHtml);

  const rnc = fields.get('RNC')
    ?? fields.get('Cedula/RNC')
    ?? '';
  const ncf = fields.get('NCF')
    ?? fields.get('No. Comprobante Fiscal')
    ?? '';
  const nombreComercial =
    fields.get('Nombre Comercial')
    ?? fields.get('Nombre / Razon Social')
    ?? undefined;

  return {
    valid: true,
    rnc: stripNonDigits(rnc),
    ncf: collapseSpaces(ncf),
    nombreComercial: nombreComercial
      ? collapseSpaces(nombreComercial)
      : undefined,
  };
}

// --- Helpers internos ---

function extractInputValue(
  html: string,
  name: string,
): string {
  // Intentar por id= primero, luego name= como fallback
  let idx = html.indexOf(`id="${name}"`);
  if (idx === -1) {
    idx = html.indexOf(`name="${name}"`);
  }
  if (idx === -1) return '';
  // Encontrar el tag <input> que lo contiene
  const tagStart = html.lastIndexOf('<', idx);
  if (tagStart === -1) return '';
  const tagEnd = html.indexOf('>', idx);
  if (tagEnd === -1) return '';
  const tag = html.slice(tagStart, tagEnd + 1);
  const valueMatch = tag.match(/value="([^"]*)"/);
  return valueMatch?.[1] ?? '';
}

// Patrones elevados a nivel de módulo para evitar recompilación por llamada
const BOLD_STYLE_PATTERN =
  /<td[^>]*style="font-weight:bold;"[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>/gi;
const BOLD_TAG_PATTERN =
  /<td><b>(.*?)<\/b><\/td>\s*<td>(.*?)<\/td>/gi;

function extractTableFields(tableHtml: string): Map<string, string> {
  const fields = new Map<string, string>();

  for (const match of tableHtml.matchAll(BOLD_STYLE_PATTERN)) {
    const label = normalizeLabel(match[1] ?? '');
    const value = stripHtmlTags(match[2] ?? '');
    if (label) fields.set(label, value);
  }

  if (fields.size === 0) {
    for (const match of tableHtml.matchAll(BOLD_TAG_PATTERN)) {
      const label = normalizeLabel(match[1] ?? '');
      const value = stripHtmlTags(match[2] ?? '');
      if (label) fields.set(label, value);
    }
  }

  return fields;
}

const ACCENT_PATTERN = /[\u0300-\u036f]/g;

function normalizeLabel(raw: string): string {
  return decodeHtmlEntities(stripHtmlTags(raw))
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFD')
    .replace(ACCENT_PATTERN, '');
}

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(parseInt(code as string, 10)),
    )
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

