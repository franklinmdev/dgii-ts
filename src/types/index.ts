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
 * Datos adicionales para consultar un e-NCF (serie E) en la DGII.
 *
 * La DGII exige el RNC del comprador (o el ID extranjero) para
 * responder el estado de un e-NCF. Se ignoran al consultar un NCF
 * de serie B.
 */
export interface NcfQueryOptions {
  /** RNC del comprador tal como aparece en la factura. */
  rncComprador?: string;
  /** Código de seguridad de 6 caracteres impreso en la factura. */
  codigoSeguridad?: string;
}

/**
 * Resultado de validación de un comprobante fiscal contra la DGII.
 *
 * `valid` significa que la DGII encontró el comprobante, no que esté
 * aceptado: para un e-NCF hay que revisar `estado` (por ejemplo
 * `Aceptado`).
 *
 * Los campos de la sección e-NCF (`rncComprador`, `codigoSeguridad`,
 * `estado`, `montoTotal`, `totalItbis`, `fechaEmision`, `fechaFirma`)
 * solo se llenan cuando el comprobante es un e-NCF (serie E).
 * `nombreComercial` no se llena para la serie E porque la DGII no lo
 * muestra en esa consulta. `fechaEmision` y `fechaFirma` son strings
 * exactamente como la DGII los renderiza.
 */
export interface NcfQueryResult {
  valid: boolean;
  rnc: string;
  ncf: string;
  nombreComercial?: string;
  // ── e-NCF (serie E) ──────────────────────────────────────────────
  rncComprador?: string;
  codigoSeguridad?: string;
  estado?: string;
  montoTotal?: number;
  totalItbis?: number;
  fechaEmision?: string;
  fechaFirma?: string;
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
