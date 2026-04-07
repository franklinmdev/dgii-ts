import type { Contribuyente, NcfQueryResult } from '../types/index.js';
import type { ClientOptions } from './types.js';
import { ScrapingClient } from '../scraping/client.js';
import { DgiiSoapClient } from '../soap/client.js';
import { ConsecutiveBreaker } from './circuit-breaker.js';
import { withRetry, DEFAULT_RETRY_OPTIONS } from './retry.js';
import type { RetryOptions } from './retry.js';
import {
  AllStrategiesFailedError,
  DgiiNotFoundError,
} from '../errors/index.js';

/**
 * Cliente resiliente para consultas a la DGII.
 *
 * Usa web scraping como estrategia principal y SOAP como
 * fallback (con circuit breaker y reintentos automáticos).
 */
export class DgiiClient {
  private readonly _scraping: ScrapingClient;
  private readonly _soap: DgiiSoapClient;
  private readonly _scrapingBreaker: ConsecutiveBreaker;
  private readonly _soapBreaker: ConsecutiveBreaker;
  private readonly _retryOptions: RetryOptions;
  private readonly _soapFallback: boolean;

  constructor(options?: ClientOptions) {
    const timeout = options?.timeout;

    this._scraping = new ScrapingClient(
      timeout ? { timeout } : undefined,
    );
    this._soap = new DgiiSoapClient(
      timeout ? { timeout } : undefined,
    );

    this._scrapingBreaker = new ConsecutiveBreaker(
      options?.circuitBreaker,
    );
    this._soapBreaker = new ConsecutiveBreaker(
      options?.circuitBreaker,
    );

    this._retryOptions = {
      ...DEFAULT_RETRY_OPTIONS,
      ...options?.retry,
    };

    this._soapFallback = options?.soapFallback ?? true;
  }

  /**
   * Consulta datos de un contribuyente por RNC o cédula.
   */
  async getContribuyente(rnc: string): Promise<Contribuyente> {
    return this._executeWithFallback(
      (client) => client.getContribuyente(rnc),
    );
  }

  /**
   * Valida un comprobante fiscal (NCF) contra la DGII.
   */
  async getNCF(rnc: string, ncf: string): Promise<NcfQueryResult> {
    return this._executeWithFallback(
      (client) => client.getNCF(rnc, ncf),
    );
  }

  private async _executeWithFallback<T>(
    operation: (client: { getContribuyente: ScrapingClient['getContribuyente']; getNCF: ScrapingClient['getNCF'] }) => Promise<T>,
  ): Promise<T> {
    const errors: Error[] = [];

    // Estrategia 1: Web scraping (primaria)
    try {
      return await this._scrapingBreaker.execute(() =>
        withRetry(
          () => operation(this._scraping),
          this._retryOptions,
        ),
      );
    } catch (error: unknown) {
      // DgiiNotFoundError es un resultado de negocio autoritativo
      if (error instanceof DgiiNotFoundError) throw error;
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    // Estrategia 2: SOAP (fallback)
    if (this._soapFallback) {
      try {
        return await this._soapBreaker.execute(() =>
          withRetry(
            () => operation(this._soap),
            this._retryOptions,
          ),
        );
      } catch (error: unknown) {
        if (error instanceof DgiiNotFoundError) throw error;
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    throw new AllStrategiesFailedError(
      `Todas las estrategias de consulta fallaron. ` +
      `Último error: ${errors[errors.length - 1]?.message ?? 'desconocido'}`,
      errors,
    );
  }
}
