import type { RetryOptions } from './retry.js';
import type { CircuitBreakerOptions } from './circuit-breaker.js';

export type { RetryOptions, CircuitBreakerOptions };

export interface ClientOptions {
  /** Tiempo de espera en milisegundos (por defecto: 15000) */
  timeout?: number;
  /**
   * Habilitar fallback a SOAP (por defecto: false). La DGII bloqueó el
   * endpoint SOAP en enero 2025; activarlo solo agrega una petición
   * inútil tras cada falla del scraping.
   */
  soapFallback?: boolean;
  /** Opciones de reintentos */
  retry?: Partial<RetryOptions>;
  /** Opciones del circuit breaker */
  circuitBreaker?: Partial<CircuitBreakerOptions>;
}
