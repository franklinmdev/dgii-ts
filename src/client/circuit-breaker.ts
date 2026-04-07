import { DgiiServiceError } from '../errors/index.js';

export interface CircuitBreakerOptions {
  /** Fallos consecutivos para abrir el circuito (por defecto: 5) */
  failureThreshold: number;
  /** Tiempo en ms antes de probar de nuevo (por defecto: 60000) */
  recoveryTimeoutMs: number;
  /** Éxitos consecutivos en HALF_OPEN para cerrar (por defecto: 2) */
  successThreshold: number;
}

export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: Readonly<CircuitBreakerOptions> =
  /*#__PURE__*/ Object.freeze({
    failureThreshold: 5,
    recoveryTimeoutMs: 60_000,
    successThreshold: 2,
  });

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker basado en fallos consecutivos.
 *
 * - CLOSED: operación normal, se cuentan fallos consecutivos
 * - OPEN: rechaza inmediatamente, espera recoveryTimeoutMs
 * - HALF_OPEN: permite llamadas de prueba, cierra después
 *   de successThreshold éxitos consecutivos
 */
export class ConsecutiveBreaker {
  private _state: CircuitState = 'CLOSED';
  private _failures = 0;
  private _successes = 0;
  private _lastFailureTime = 0;
  private readonly _options: CircuitBreakerOptions;

  constructor(options?: Partial<CircuitBreakerOptions>) {
    this._options = {
      ...DEFAULT_CIRCUIT_BREAKER_OPTIONS,
      ...options,
    };
  }

  get state(): CircuitState {
    if (this._state === 'OPEN') {
      if (Date.now() - this._lastFailureTime >= this._options.recoveryTimeoutMs) {
        return 'HALF_OPEN';
      }
    }
    return this._state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.state;

    if (currentState === 'OPEN') {
      throw new DgiiServiceError(
        'Circuito abierto: estrategia deshabilitada temporalmente',
      );
    }

    if (currentState === 'HALF_OPEN' && this._state === 'OPEN') {
      this._state = 'HALF_OPEN';
      this._successes = 0;
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error: unknown) {
      this._onFailure();
      throw error;
    }
  }

  reset(): void {
    this._state = 'CLOSED';
    this._failures = 0;
    this._successes = 0;
    this._lastFailureTime = 0;
  }

  private _onSuccess(): void {
    if (this._state === 'HALF_OPEN') {
      this._successes++;
      if (this._successes >= this._options.successThreshold) {
        this._state = 'CLOSED';
        this._failures = 0;
      }
    } else {
      this._failures = 0;
    }
  }

  private _onFailure(): void {
    this._failures++;
    this._lastFailureTime = Date.now();
    if (this._failures >= this._options.failureThreshold) {
      this._state = 'OPEN';
    }
  }
}
