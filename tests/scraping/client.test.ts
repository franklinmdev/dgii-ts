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

const MOCK_ECF_RESULT_HTML =
  '<html><body>' +
  '<span id="cphMain_lblInformacion"></span>' +
  '<div id="cphMain_PResultadoFE">' +
  '<table class="table table-striped detailview">' +
  '<tr><th>Rnc Emisor</th><td><span id="cphMain_lblrncemisor">101010632</span></td></tr>' +
  '<tr><th>Rnc Comprador</th><td><span id="cphMain_lblrnccomprador">131262414</span></td></tr>' +
  '<tr><th>e-NCF</th><td><span id="cphMain_lblencf">E310125217173</span></td></tr>' +
  '<tr><th>C&#243;digo de Seguridad</th><td><span id="cphMain_lblCodSeguridad">KrOLI0</span></td></tr>' +
  '<tr><th>Estado</th><td><span id="cphMain_lblEstadoFe">Aceptado</span></td></tr>' +
  '<tr><th>Monto Total</th><td><span id="cphMain_lblMontoTotal">230677.74</span></td></tr>' +
  '<tr><th>Total de ITBIS</th><td><span id="cphMain_lblTotalItbis">35188.13</span></td></tr>' +
  '<tr><th>Fecha Emisi&#243;n</th><td><span id="cphMain_lblFechaEmision">2026-02-11</span></td></tr>' +
  '<tr><th>Fecha de Firma</th><td><span id="cphMain_lblFechaFirma">2026-02-11</span></td></tr>' +
  '</table></div></body></html>';

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

  it('clamps timeout al mínimo de 1000ms', () => {
    const client = new ScrapingClient({ timeout: 100 });
    expect(client).toBeInstanceOf(ScrapingClient);
  });

  it('retorna contribuyente para RNC válido', async () => {
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

  it('lanza DgiiServiceError para input vacío', async () => {
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
    const err = await client.getContribuyente('131098193')
      .catch((e: unknown) => e) as DgiiServiceError;
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

  it('getNCF lanza DgiiServiceError para rnc vacío', async () => {
    const client = new ScrapingClient();
    await expect(client.getNCF('', 'B0100000001')).rejects.toThrow(
      DgiiServiceError,
    );
  });

  it('getNCF lanza DgiiServiceError para ncf vacío', async () => {
    const client = new ScrapingClient();
    await expect(client.getNCF('131098193', '')).rejects.toThrow(
      DgiiServiceError,
    );
  });

  // ── e-NCF (serie E) ───────────────────────────────────────────────

  it('getNCF retorna e-NCF válido con todos los campos', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      const body = callCount === 1 ? MOCK_PAGE_HTML : MOCK_ECF_RESULT_HTML;
      return Promise.resolve(new Response(body, { status: 200 }));
    });

    const client = new ScrapingClient();
    const result = await client.getNCF('101010632', 'E310125217173', '131262414', 'KrOLI0');

    expect(result.valid).toBe(true);
    expect(result.rnc).toBe('101010632');
    expect(result.ncf).toBe('E310125217173');
    expect(result.rncComprador).toBe('131262414');
    expect(result.codigoSeguridad).toBe('KrOLI0');
    expect(result.estado).toBe('Aceptado');
    expect(result.montoTotal).toBe(230677.74);
    expect(result.totalItbis).toBe(35188.13);
    expect(result.fechaEmision).toBe('2026-02-11');
    expect(result.fechaFirma).toBe('2026-02-11');
  });

  it('getNCF envía campos E-series en el POST body', async () => {
    let callCount = 0;
    let postBody: string | undefined;
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response(MOCK_PAGE_HTML, { status: 200 }));
      }
      postBody = opts?.body as string;
      return Promise.resolve(new Response(MOCK_ECF_RESULT_HTML, { status: 200 }));
    });

    const client = new ScrapingClient();
    await client.getNCF('101010632', 'E310125217173', '131262414', 'KrOLI0');

    expect(postBody).toBeDefined();
    expect(postBody!).toContain(encodeURIComponent('ctl00$cphMain$txtRncComprador').replace(/%24/g, '$') + '=' + encodeURIComponent('131262414'));
    expect(postBody!).toContain(encodeURIComponent('ctl00$cphMain$txtCodigoSeg').replace(/%24/g, '$') + '=' + encodeURIComponent('KrOLI0'));
  });

  it('getNCF omite campos E-series para NCF serie B', async () => {
    let callCount = 0;
    let postBody: string | undefined;
    global.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response(MOCK_PAGE_HTML, { status: 200 }));
      }
      postBody = opts?.body as string;
      return Promise.resolve(new Response(MOCK_RESULT_HTML, { status: 200 }));
    });

    const client = new ScrapingClient();
    await client.getNCF('131098193', 'B0100000001');

    expect(postBody).toBeDefined();
    expect(postBody!).not.toContain('txtRncComprador');
    expect(postBody!).not.toContain('txtCodigoSeg');
  });

  it('getNCF retorna valid false para e-NCF inválido', async () => {
    const ecfErrorHtml =
      '<html><body>' +
      '<span id="cphMain_lblInformacion">El NCF digitado no es v&#225;lido.</span>' +
      '</body></html>';

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      const body = callCount === 1 ? MOCK_PAGE_HTML : ecfErrorHtml;
      return Promise.resolve(new Response(body, { status: 200 }));
    });

    const client = new ScrapingClient();
    const result = await client.getNCF('101010632', 'E310125217173', '131262414', 'BAD');

    expect(result.valid).toBe(false);
  });
});
