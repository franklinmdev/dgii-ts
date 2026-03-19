import type { Contribuyente, NcfQueryResult, SoapClientOptions } from './types.js';

/**
 * Cliente SOAP tipado para el servicio WSMovilDGII de la DGII.
 *
 * TODO: Implementar llamadas SOAP con node:https.
 */
export class DgiiSoapClient {
  private readonly _options: Required<SoapClientOptions>;

  constructor(options?: SoapClientOptions) {
    this._options = {
      timeout: options?.timeout ?? 10000,
      baseUrl:
        options?.baseUrl ??
        'https://dgii.gov.do/wsMovilDGII/WSMovilDGII.asmx',
    };
  }

  /**
   * Consulta datos de un contribuyente por RNC o cédula.
   *
   * TODO: Implementar llamada SOAP a GetContribuyentes.
   */
  async getContribuyente(_rnc: string): Promise<Contribuyente> {
    void this._options;
    throw new Error('No implementado. Disponible en una futura versión.');
  }

  /**
   * Valida un comprobante fiscal (NCF) contra la DGII.
   *
   * TODO: Implementar llamada SOAP a GetNCF.
   */
  async getNCF(_rnc: string, _ncf: string): Promise<NcfQueryResult> {
    void this._options;
    throw new Error('No implementado. Disponible en una futura versión.');
  }
}
