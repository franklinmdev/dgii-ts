/**
 * Resultado de validación para RNC y cédula.
 */
export type ValidationResult =
  | { valid: true; formatted: string }
  | { valid: false; formatted?: undefined };

/**
 * Resultado de validación para NCF (serie B) y e-NCF (serie E).
 */
export type NcfValidationResult =
  | { valid: true; type: string; serie: string }
  | { valid: false; type?: undefined; serie?: undefined };

/**
 * Datos de un contribuyente registrado en la DGII.
 *
 * `esFacturadorElectronico` indica si la DGII certificó al RNC como
 * emisor de e-CF. Hoy solo el parser de scraping deriva el valor real;
 * el parser SOAP retorna `false` hasta que la DGII restaure el endpoint.
 */
export interface Contribuyente {
  rnc: string;
  nombre: string;
  nombreComercial: string;
  estado: string;
  categoria: string;
  esFacturadorElectronico: boolean;
  actividadEconomica?: string;
  regimenDePagos?: string;
  administracionLocal?: string;
}

/**
 * Resultado de validación de un comprobante fiscal contra la DGII.
 */
export interface NcfQueryResult {
  valid: boolean;
  rnc: string;
  ncf: string;
  nombreComercial?: string;
}

/**
 * Registro del archivo masivo de contribuyentes (DGII_RNC.zip).
 */
export interface BulkContribuyente {
  rnc: string;
  nombre: string;
  nombreComercial: string;
  actividad: string;
  /**
   * Estado tal como lo trae el archivo masivo, normalizado a mayúsculas:
   * uno de los valores de `DGII_ESTADOS` (ACTIVO, SUSPENDIDO, DADO DE
   * BAJA, ...). Es un vocabulario más amplio que el `estado` binario
   * (ACTIVO/INACTIVO) de {@link Contribuyente}, así que no son
   * intercambiables al comparar entre fuentes.
   */
  estado: string;
  regimen: string;
  fechaConstitucion: string;
}
