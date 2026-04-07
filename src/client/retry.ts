import {
  DgiiConnectionError,
  DgiiNotFoundError,
  DgiiServiceError,
} from '../errors/index.js';

export interface RetryOptions {
  /** Número máximo de reintentos (por defecto: 2) */
  maxRetries: number;
  /** Delay base en milisegundos (por defecto: 500) */
  baseDelayMs: number;
  /** Delay máximo en milisegundos (por defecto: 10000) */
  maxDelayMs: number;
}

export const DEFAULT_RETRY_OPTIONS: Readonly<RetryOptions> =
  /*#__PURE__*/ Object.freeze({
    maxRetries: 2,
    baseDelayMs: 500,
    maxDelayMs: 10_000,
  });

/**
 * Determina si un error es reintentable.
 *
 * - DgiiConnectionError: siempre reintentable
 * - DgiiServiceError con statusCode >= 500: reintentable
 * - DgiiNotFoundError: nunca reintentable (resultado de negocio)
 * - DgiiServiceError con 403/4xx: nunca reintentable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof DgiiNotFoundError) return false;
  if (error instanceof DgiiConnectionError) return true;
  if (error instanceof DgiiServiceError) {
    const code = error.statusCode;
    if (code !== undefined && code >= 500) return true;
    return false;
  }
  return false;
}

/**
 * Ejecuta una función con reintentos y backoff exponencial
 * con jitter completo.
 *
 * Fórmula: delay = random(0, min(maxDelay, baseDelay * 2^attempt))
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      if (attempt >= options.maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const exponential = Math.min(
        options.maxDelayMs,
        options.baseDelayMs * Math.pow(2, attempt),
      );
      const delay = Math.random() * exponential;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
