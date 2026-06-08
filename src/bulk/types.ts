import type { BulkContribuyente } from '../types/index.js';

export type { BulkContribuyente };

export interface DownloadOptions {
  /** Directorio de destino para el archivo ZIP */
  outputDir: string;
  /** Tiempo de espera en milisegundos (por defecto: 60000) */
  timeout?: number;
}

export interface ParseOptions {
  /** Ruta al archivo TXT extraído del ZIP */
  filePath: string;
  /**
   * Codificación del archivo. La DGII publica el TXT en latin-1
   * (ISO-8859-1), que es el valor por defecto. Permite anularla si una
   * futura versión del archivo llega en otra codificación (p. ej. UTF-8).
   */
  encoding?: BufferEncoding;
}

export const DGII_BULK_URL: string =
  'https://dgii.gov.do/app/WebApps/Consultas/RNC/DGII_RNC.zip';

/**
 * Valores conocidos de la columna `estado` (col 9) en el archivo masivo,
 * verificados contra ~778k filas en producción. El parser usa este
 * vocabulario para detectar un cambio de layout: si ninguna fila de una
 * muestra trae un `estado` reconocido, el formato de la DGII cambió.
 */
export const DGII_ESTADOS = /*#__PURE__*/ Object.freeze([
  'ACTIVO',
  'SUSPENDIDO',
  'DADO DE BAJA',
  'CESE TEMPORAL',
  'ANULADO',
  'RECHAZADO',
] as const);

/**
 * Valor de la columna `estado` del archivo masivo: uno de
 * {@link DGII_ESTADOS}. Vocabulario completo de la DGII, distinto del
 * `estado` binario (ACTIVO/INACTIVO) que exponen el scraping y el SOAP.
 */
export type DgiiEstado = (typeof DGII_ESTADOS)[number];
