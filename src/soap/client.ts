import type { Contribuyente, NcfQueryResult, SoapClientOptions } from './types.js';
import { DGII_SOAP_BASE_URL } from './endpoints.js';

/**
 * Cliente SOAP tipado para el servicio WSMovilDGII de la DGII.
 *
 * TODO: Implementar llamadas SOAP con node:https.
 */
export class DgiiSoapClient {
  private readonly _options: Required<SoapClientOptions>;

  constructor(options?: SoapClientOptions) {
    const baseUrl = options?.baseUrl ?? DGII_SOAP_BASE_URL;
    if (!baseUrl.startsWith('https://')) {
      throw new Error('baseUrl debe usar HTTPS');
    }

    this._options = {
      timeout: Math.min(Math.max(options?.timeout ?? 10000, 1000), 120000),
      baseUrl,
    };
  }

  /**
   * Consulta datos de un contribuyente por RNC o cédula.
   *
   * TODO: Implementar llamada SOAP a GetContribuyentes.
   */
  async getContribuyente(_rnc: string): Promise<Contribuyente> {
    void this._options; // consumed when SOAP calls are implemented
    throw new Error('getContribuyente: no implementado.');
  }

  /**
   * Valida un comprobante fiscal (NCF) contra la DGII.
   *
   * TODO: Implementar llamada SOAP a GetNCF.
   */
  async getNCF(_rnc: string, _ncf: string): Promise<NcfQueryResult> {
    void this._options;
    throw new Error('getNCF: no implementado.');
  }
}
