import type { Contribuyente, NcfQueryResult } from '../types/index.js';

export type { Contribuyente, NcfQueryResult };

export interface SoapClientOptions {
  /** Tiempo de espera en milisegundos (por defecto: 10000) */
  timeout?: number;
  /** URL base del servicio SOAP (por defecto: endpoint oficial de la DGII) */
  baseUrl?: string;
}
