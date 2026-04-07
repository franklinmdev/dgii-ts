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
 */
export interface Contribuyente {
  rnc: string;
  nombre: string;
  nombreComercial: string;
  estado: string;
  categoria: string;
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
  estado: string;
  regimen: string;
  fechaConstitucion: string;
}
