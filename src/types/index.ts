/**
 * Resultado de validación para RNC y cédula.
 */
export interface ValidationResult {
  valid: boolean;
  formatted?: string;
}

/**
 * Resultado de validación para NCF (serie B) y e-NCF (serie E).
 */
export interface NcfValidationResult {
  valid: boolean;
  type?: string;
  serie?: string;
}

/**
 * Datos de un contribuyente registrado en la DGII.
 */
export interface Contribuyente {
  rnc: string;
  nombre: string;
  nombreComercial: string;
  estado: string;
  categoria: string;
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
