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
}

export const DGII_BULK_URL: string =
  'https://dgii.gov.do/app/WebApps/Consultas/RNC/DGII_RNC.zip';
