import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScrapingClient } from '../../src/scraping/client.js';
import {
  DgiiConnectionError,
  DgiiNotFoundError,
  DgiiServiceError,
} from '../../src/errors/index.js';

const MOCK_PAGE_HTML =
  '<html><body>' +
  '<input type="hidden" name="__VIEWSTATE" value="VS_TOKEN" />' +
  '<input type="hidden" name="__VIEWSTATEGENERATOR" value="4F4BAA71" />' +
  '<input type="hidden" name="__EVENTVALIDATION" value="EV_TOKEN" />' +
  '</body></html>';

const MOCK_RESULT_HTML =
  '<html><body>' +
  '<span id="cphMain_lblInformacion"></span>' +
  '<table id="cphMain_dvDatosContribuyentes">' +
  '<tr><td style="font-weight:bold;">Cedula/RNC</td><td>131-09819-3</td></tr>' +
  '<tr><td style="font-weight:bold;">Nombre/Razon Social</td><td>EMPRESA SRL</td></tr>' +
  '<tr><td style="font-weight:bold;">Nombre Comercial</td><td>EJEMPLO</td></tr>' +
  '<tr><td style="font-weight:bold;">Estado</td><td>ACTIVO</td></tr>' +
  '</table></body></html>';

const MOCK_NOT_FOUND_HTML =
  '<html><body>' +
  '<span id="cphMain_lblInformacion">El RNC/C&#233;dula consultado no se encuentra inscrito como Contribuyente.</span>' +
  '</body></html>';

describe('ScrapingClient', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('se puede instanciar sin opciones', () => {
    const client = new ScrapingClient();
    expect(client).toBeInstanceOf(ScrapingClient);
  });

  it('se puede instanciar con opciones personalizadas', () => {
    const client = new ScrapingClient({
      timeout: 5000,
      baseRncUrl: 'https://example.com/rnc.aspx',
      baseNcfUrl: 'https://example.com/ncf.aspx',
    });
    expect(client).toBeInstanceOf(ScrapingClient);
  });

  it('clamps timeout al minimo de 1000ms', () => {
    const client = new ScrapingClient({ timeout: 100 });
    expect(client).toBeInstanceOf(ScrapingClient);
  });

  it('retorna contribuyente para RNC valido', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      const body = callCount === 1 ? MOCK_PAGE_HTML : MOCK_RESULT_HTML;
      return Promise.resolve(new Response(body, { status: 200 }));
    });

    const client = new ScrapingClient();
    const result = await client.getContribuyente('131098193');

    expect(result.rnc).toBe('131098193');
    expect(result.nombre).toBe('EMPRESA SRL');
    expect(result.estado).toBe('ACTIVO');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('lanza DgiiNotFoundError para RNC inexistente', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      const body = callCount === 1 ? MOCK_PAGE_HTML : MOCK_NOT_FOUND_HTML;
      return Promise.resolve(new Response(body, { status: 200 }));
    });

    const client = new ScrapingClient();
    await expect(client.getContribuyente('000000000')).rejects.toThrow(
      DgiiNotFoundError,
    );
  });

  it('lanza DgiiServiceError para HTTP 500', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('', { status: 500 }),
    );

    const client = new ScrapingClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiServiceError,
    );
  });

  it('lanza DgiiConnectionError para error de red', async () => {
    global.fetch = vi.fn().mockRejectedValue(
      new TypeError('fetch failed'),
    );

    const client = new ScrapingClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiConnectionError,
    );
  });

  it('lanza DgiiConnectionError para timeout', async () => {
    const timeoutError = new DOMException('signal timed out', 'TimeoutError');
    global.fetch = vi.fn().mockRejectedValue(timeoutError);

    const client = new ScrapingClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiConnectionError,
    );
  });

  it('lanza DgiiServiceError para input vacio', async () => {
    const client = new ScrapingClient();
    await expect(client.getContribuyente('')).rejects.toThrow(
      DgiiServiceError,
    );
  });

  it('lanza DgiiConnectionError para timeout envuelto en TypeError', async () => {
    const cause = new DOMException('signal timed out', 'TimeoutError');
    const wrappedError = new TypeError('fetch failed');
    Object.defineProperty(wrappedError, 'cause', { value: cause });
    global.fetch = vi.fn().mockRejectedValue(wrappedError);

    const client = new ScrapingClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiConnectionError,
    );
  });

  it('lanza DgiiConnectionError para AbortError', async () => {
    const abortError = new DOMException('aborted', 'AbortError');
    global.fetch = vi.fn().mockRejectedValue(abortError);

    const client = new ScrapingClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiConnectionError,
    );
  });

  it('lanza DgiiServiceError para HTTP 403', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('', { status: 403 }),
    );

    const client = new ScrapingClient();
    const err = await client.getContribuyente('131098193').catch((e: DgiiServiceError) => e);
    expect(err).toBeInstanceOf(DgiiServiceError);
    expect(err.statusCode).toBe(403);
  });

  it('lanza DgiiServiceError si POST retorna error HTTP', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response(MOCK_PAGE_HTML, { status: 200 }));
      }
      return Promise.resolve(new Response('', { status: 500 }));
    });

    const client = new ScrapingClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiServiceError,
    );
  });

  it('lanza DgiiConnectionError si POST tiene error de red', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response(MOCK_PAGE_HTML, { status: 200 }));
      }
      return Promise.reject(new TypeError('network error'));
    });

    const client = new ScrapingClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiConnectionError,
    );
  });

  it('getNCF lanza DgiiServiceError para rnc vacio', async () => {
    const client = new ScrapingClient();
    await expect(client.getNCF('', 'B0100000001')).rejects.toThrow(
      DgiiServiceError,
    );
  });

  it('getNCF lanza DgiiServiceError para ncf vacio', async () => {
    const client = new ScrapingClient();
    await expect(client.getNCF('131098193', '')).rejects.toThrow(
      DgiiServiceError,
    );
  });
});
