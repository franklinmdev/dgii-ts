import type { Contribuyente, NcfQueryResult } from '../types/index.js';
import type { ScrapingClientOptions } from './types.js';
import { DGII_RNC_URL, DGII_NCF_URL, FORM_FIELDS } from './endpoints.js';
import {
  extractViewStateTokens,
  parseContribuyenteHtml,
  parseNcfHtml,
} from './html-parser.js';
import { DgiiServiceError } from '../errors/index.js';
import { wrapFetchError } from '../utils/fetch-error.js';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/120.0.0.0 Safari/537.36';

/**
 * Cliente que consulta la DGII via web scraping de la pagina
 * de consultas ASP.NET.
 */
export class ScrapingClient {
  private readonly _rncUrl: string;
  private readonly _ncfUrl: string;
  private readonly _timeout: number;

  constructor(options?: ScrapingClientOptions) {
    this._rncUrl = options?.baseRncUrl ?? DGII_RNC_URL;
    this._ncfUrl = options?.baseNcfUrl ?? DGII_NCF_URL;
    this._timeout = Math.min(
      Math.max(options?.timeout ?? 15_000, 1_000),
      120_000,
    );
  }

  /**
   * Consulta datos de un contribuyente por RNC o cedula.
   */
  async getContribuyente(rnc: string): Promise<Contribuyente> {
    if (typeof rnc !== 'string' || rnc.trim() === '') {
      throw new DgiiServiceError('El parametro rnc es requerido');
    }

    const tokens = await this._fetchTokens(this._rncUrl);

    const body = buildFormBody([
      ['__EVENTTARGET', ''],
      ['__EVENTARGUMENT', ''],
      [FORM_FIELDS.viewState, tokens.viewState],
      [FORM_FIELDS.viewStateGenerator, tokens.viewStateGenerator],
      [FORM_FIELDS.eventValidation, tokens.eventValidation],
      [FORM_FIELDS.rncInput, rnc.trim()],
      ['ctl00$cphMain$txtRazonSocial', ''],
      ['ctl00$cphMain$hidActiveTab', 'rnc'],
      [FORM_FIELDS.rncSubmit, 'BUSCAR'],
    ]);

    const html = await this._post(this._rncUrl, body);
    return parseContribuyenteHtml(html);
  }

  /**
   * Valida un comprobante fiscal (NCF) contra la DGII.
   */
  async getNCF(rnc: string, ncf: string): Promise<NcfQueryResult> {
    if (typeof rnc !== 'string' || rnc.trim() === '') {
      throw new DgiiServiceError('El parametro rnc es requerido');
    }
    if (typeof ncf !== 'string' || ncf.trim() === '') {
      throw new DgiiServiceError('El parametro ncf es requerido');
    }

    const tokens = await this._fetchTokens(this._ncfUrl);

    const body = buildFormBody([
      [FORM_FIELDS.viewState, tokens.viewState],
      [FORM_FIELDS.viewStateGenerator, tokens.viewStateGenerator],
      [FORM_FIELDS.eventValidation, tokens.eventValidation],
      [FORM_FIELDS.ncfRncInput, rnc.trim()],
      [FORM_FIELDS.ncfInput, ncf.trim()],
      [FORM_FIELDS.ncfSubmit, 'Buscar'],
    ]);

    const html = await this._post(this._ncfUrl, body);
    return parseNcfHtml(html);
  }

  private async _fetchTokens(url: string) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': DEFAULT_USER_AGENT },
        signal: AbortSignal.timeout(this._timeout),
      });
    } catch (error: unknown) {
      throw this._wrapFetchError(error);
    }

    if (!response.ok) {
      throw new DgiiServiceError(
        `La DGII respondio con HTTP ${response.status} al obtener la pagina`,
        { statusCode: response.status },
      );
    }

    const html = await response.text();
    return extractViewStateTokens(html);
  }

  private async _post(
    url: string,
    body: string,
  ): Promise<string> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': url,
        },
        body,
        signal: AbortSignal.timeout(this._timeout),
      });
    } catch (error: unknown) {
      throw this._wrapFetchError(error);
    }

    if (!response.ok) {
      throw new DgiiServiceError(
        `La DGII respondio con HTTP ${response.status}`,
        { statusCode: response.status },
      );
    }

    return response.text();
  }

  private _wrapFetchError(error: unknown) {
    return wrapFetchError(error, this._timeout);
  }
}

/**
 * Construye el body de un POST form-urlencoded.
 * Usa encodeURIComponent para los valores pero mantiene los
 * nombres de campo literales (ASP.NET requiere `$` literal,
 * no `%24`).
 */
function buildFormBody(
  fields: ReadonlyArray<readonly [string, string]>,
): string {
  return fields
    .map(([name, value]) =>
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
        .replace(/%24/g, '$'),
    )
    .join('&');
}
