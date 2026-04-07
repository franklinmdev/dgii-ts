import type { Contribuyente, NcfQueryResult, SoapClientOptions } from './types.js';
import { DGII_SOAP_BASE_URL, SOAP_ACTIONS } from './endpoints.js';
import { buildGetContribuyentesEnvelope, buildGetNcfEnvelope } from './envelopes.js';
import { parseContribuyenteResponse, parseNcfResponse } from './parser.js';
import { DgiiServiceError } from '../errors/index.js';
import { wrapFetchError } from '../utils/fetch-error.js';

/**
 * Cliente SOAP tipado para el servicio WSMovilDGII de la DGII.
 *
 * @deprecated Usar {@link DgiiClient} en su lugar. El endpoint SOAP
 * de la DGII fue bloqueado permanentemente en enero 2025.
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

  private async _fetch(
    soapAction: string,
    body: string,
  ): Promise<string> {
    const url = this._options.baseUrl;
    const timeout = this._options.timeout;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type':
            `application/soap+xml; charset=utf-8; action="${soapAction}"`,
        },
        body,
        signal: AbortSignal.timeout(timeout),
      });
    } catch (error: unknown) {
      throw wrapFetchError(error, timeout);
    }

    // Defensa contra respuestas sobredimensionadas (max 1 MB).
    // Verificar Content-Length ANTES de leer el body en memoria.
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
      throw new DgiiServiceError(
        'Respuesta de la DGII excede el tamaño máximo permitido',
      );
    }

    if (response.status === 403) {
      throw new DgiiServiceError(
        'Acceso denegado por la DGII (HTTP 403). '
        + 'El servicio puede estar restringido por ubicación geográfica.',
        { statusCode: 403 },
      );
    }

    if (!response.ok) {
      throw new DgiiServiceError(
        `El servicio de la DGII respondió con HTTP ${response.status}`,
        { statusCode: response.status },
      );
    }

    return response.text();
  }

  /**
   * Consulta datos de un contribuyente por RNC o cédula.
   */
  async getContribuyente(rnc: string): Promise<Contribuyente> {
    if (typeof rnc !== 'string' || rnc.trim() === '') {
      throw new DgiiServiceError('El parámetro rnc es requerido');
    }

    const envelope = buildGetContribuyentesEnvelope(rnc.trim());
    const responseXml = await this._fetch(
      SOAP_ACTIONS.getContribuyentes,
      envelope,
    );

    return parseContribuyenteResponse(responseXml);
  }

  /**
   * Valida un comprobante fiscal (NCF) contra la DGII.
   */
  async getNCF(rnc: string, ncf: string): Promise<NcfQueryResult> {
    if (typeof rnc !== 'string' || rnc.trim() === '') {
      throw new DgiiServiceError('El parámetro rnc es requerido');
    }
    if (typeof ncf !== 'string' || ncf.trim() === '') {
      throw new DgiiServiceError('El parámetro ncf es requerido');
    }

    const envelope = buildGetNcfEnvelope(rnc.trim(), ncf.trim());
    const responseXml = await this._fetch(SOAP_ACTIONS.getNCF, envelope);

    return parseNcfResponse(responseXml);
  }
}
