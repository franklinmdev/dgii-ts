import type { Contribuyente, NcfQueryResult } from '../types/index.js';

export type { Contribuyente, NcfQueryResult };

export interface ScrapingClientOptions {
  /** Tiempo de espera en milisegundos (por defecto: 15000) */
  timeout?: number;
  /** URL de la pagina de consulta RNC */
  baseRncUrl?: string;
  /** URL de la pagina de consulta NCF */
  baseNcfUrl?: string;
}
