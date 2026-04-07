import type { RetryOptions } from './retry.js';
import type { CircuitBreakerOptions } from './circuit-breaker.js';

export type { RetryOptions, CircuitBreakerOptions };

export interface ClientOptions {
  /** Tiempo de espera en milisegundos (por defecto: 15000) */
  timeout?: number;
  /** Habilitar fallback a SOAP (por defecto: true) */
  soapFallback?: boolean;
  /** Opciones de reintentos */
  retry?: Partial<RetryOptions>;
  /** Opciones del circuit breaker */
  circuitBreaker?: Partial<CircuitBreakerOptions>;
}
