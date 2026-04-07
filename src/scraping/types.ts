import type { Contribuyente, NcfQueryResult } from '../types/index.js';

export type { Contribuyente, NcfQueryResult };

export interface ScrapingClientOptions {
  /** Tiempo de espera en milisegundos (por defecto: 15000) */
  timeout?: number;
  /** URL de la página de consulta RNC */
  baseRncUrl?: string;
  /** URL de la página de consulta NCF */
  baseNcfUrl?: string;
}
