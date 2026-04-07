import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DgiiClient } from '../../src/client/client.js';
import {
  DgiiConnectionError,
  DgiiNotFoundError,
  AllStrategiesFailedError,
} from '../../src/errors/index.js';

// Mock HTML responses
const MOCK_PAGE_HTML =
  '<html><body>' +
  '<input type="hidden" name="__VIEWSTATE" value="VS" />' +
  '<input type="hidden" name="__VIEWSTATEGENERATOR" value="4F4BAA71" />' +
  '<input type="hidden" name="__EVENTVALIDATION" value="EV" />' +
  '</body></html>';

const MOCK_RESULT_HTML =
  '<html><body>' +
  '<span id="cphMain_lblInformacion"></span>' +
  '<table id="cphMain_dvDatosContribuyentes">' +
  '<tr><td style="font-weight:bold;">Cedula/RNC</td><td>131-09819-3</td></tr>' +
  '<tr><td style="font-weight:bold;">Nombre/Razon Social</td><td>TEST SRL</td></tr>' +
  '<tr><td style="font-weight:bold;">Nombre Comercial</td><td>TEST</td></tr>' +
  '<tr><td style="font-weight:bold;">Estado</td><td>ACTIVO</td></tr>' +
  '</table></body></html>';

// SOAP XML response
const MOCK_SOAP_XML =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">' +
  '<soap:Body>' +
  '<GetContribuyentesResponse xmlns="http://dgii.gov.do/">' +
  '<GetContribuyentesResult>' +
  '{"RGE_RUC":"131098193","RGE_NOMBRE":"SOAP RESULT","NOMBRE_COMERCIAL":"SOAP","CATEGORIA":"0","ESTATUS":"2"}' +
  '</GetContribuyentesResult>' +
  '</GetContribuyentesResponse>' +
  '</soap:Body></soap:Envelope>';

describe('DgiiClient', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('se puede instanciar sin opciones', () => {
    const client = new DgiiClient();
    expect(client).toBeInstanceOf(DgiiClient);
  });

  it('usa scraping como estrategia primaria', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      const body = callCount === 1 ? MOCK_PAGE_HTML : MOCK_RESULT_HTML;
      return Promise.resolve(new Response(body, { status: 200 }));
    });

    const client = new DgiiClient({ retry: { maxRetries: 0 } });
    const result = await client.getContribuyente('131098193');

    expect(result.rnc).toBe('131098193');
    expect(result.nombre).toBe('TEST SRL');
    // Solo 2 llamadas (GET page + POST form) -- SOAP nunca llamado
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('cae al SOAP si scraping falla', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((_url: string) => {
      callCount++;
      // Primeras 2 llamadas: scraping GET falla
      if (callCount <= 1) {
        return Promise.reject(new TypeError('fetch failed'));
      }
      // Llamada 2: SOAP funciona
      return Promise.resolve(new Response(MOCK_SOAP_XML, { status: 200 }));
    });

    const client = new DgiiClient({ retry: { maxRetries: 0 } });
    const result = await client.getContribuyente('131098193');

    expect(result.rnc).toBe('131098193');
    expect(result.nombre).toBe('SOAP RESULT');
  });

  it('lanza AllStrategiesFailedError si todo falla', async () => {
    global.fetch = vi.fn().mockRejectedValue(
      new TypeError('fetch failed'),
    );

    const client = new DgiiClient({ retry: { maxRetries: 0 } });
    await expect(
      client.getContribuyente('131098193'),
    ).rejects.toThrow(AllStrategiesFailedError);
  });

  it('propaga DgiiNotFoundError sin intentar SOAP', async () => {
    let callCount = 0;
    const notFoundHtml =
      '<html><body>' +
      '<span id="cphMain_lblInformacion">no se encuentra inscrito</span>' +
      '</body></html>';

    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      const body = callCount === 1 ? MOCK_PAGE_HTML : notFoundHtml;
      return Promise.resolve(new Response(body, { status: 200 }));
    });

    const client = new DgiiClient({ retry: { maxRetries: 0 } });
    await expect(
      client.getContribuyente('000000000'),
    ).rejects.toThrow(DgiiNotFoundError);

    // Solo 2 llamadas (scraping GET + POST) -- SOAP nunca llamado
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('respeta soapFallback: false', async () => {
    global.fetch = vi.fn().mockRejectedValue(
      new TypeError('fetch failed'),
    );

    const client = new DgiiClient({
      soapFallback: false,
      retry: { maxRetries: 0 },
    });
    await expect(
      client.getContribuyente('131098193'),
    ).rejects.toThrow(AllStrategiesFailedError);

    // Solo 1 llamada (scraping) -- SOAP nunca intentado
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('getNCF funciona via scraping', async () => {
    const NCF_PAGE =
      '<html><body>' +
      '<input type="hidden" name="__VIEWSTATE" value="VS" />' +
      '<input type="hidden" name="__VIEWSTATEGENERATOR" value="43758EFE" />' +
      '<input type="hidden" name="__EVENTVALIDATION" value="EV" />' +
      '</body></html>';

    const NCF_RESULT =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosComprobante">' +
      '<tr><td style="font-weight:bold;">RNC</td><td>131-09819-3</td></tr>' +
      '<tr><td style="font-weight:bold;">NCF</td><td>B0100000001</td></tr>' +
      '</table></body></html>';

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      const body = callCount === 1 ? NCF_PAGE : NCF_RESULT;
      return Promise.resolve(new Response(body, { status: 200 }));
    });

    const client = new DgiiClient({ retry: { maxRetries: 0 } });
    const result = await client.getNCF('131098193', 'B0100000001');
    expect(result.valid).toBe(true);
  });

  it('se puede instanciar con timeout personalizado', () => {
    const client = new DgiiClient({ timeout: 5000 });
    expect(client).toBeInstanceOf(DgiiClient);
  });

  it('se puede instanciar con opciones de retry y circuit breaker', () => {
    const client = new DgiiClient({
      retry: { maxRetries: 1, baseDelayMs: 100 },
      circuitBreaker: { failureThreshold: 3 },
    });
    expect(client).toBeInstanceOf(DgiiClient);
  });

  it('propaga DgiiNotFoundError desde SOAP sin iterar mas', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      // Scraping fails (connection error)
      if (callCount <= 1) {
        return Promise.reject(new TypeError('scraping failed'));
      }
      // SOAP returns not-found XML
      const soapNotFound =
        '<?xml version="1.0"?>' +
        '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">' +
        '<soap:Body><GetContribuyentesResponse xmlns="http://dgii.gov.do/">' +
        '<GetContribuyentesResult>0</GetContribuyentesResult>' +
        '</GetContribuyentesResponse></soap:Body></soap:Envelope>';
      return Promise.resolve(new Response(soapNotFound, { status: 200 }));
    });

    const client = new DgiiClient({ retry: { maxRetries: 0 } });
    await expect(
      client.getContribuyente('000000000'),
    ).rejects.toThrow(DgiiNotFoundError);
  });

  it('AllStrategiesFailedError contiene todos los errores', async () => {
    global.fetch = vi.fn().mockRejectedValue(
      new TypeError('fetch failed'),
    );

    const client = new DgiiClient({ retry: { maxRetries: 0 } });

    try {
      await client.getContribuyente('131098193');
    } catch (error) {
      expect(error).toBeInstanceOf(AllStrategiesFailedError);
      const asf = error as AllStrategiesFailedError;
      expect(asf.errors.length).toBeGreaterThanOrEqual(2);
    }
  });
});
