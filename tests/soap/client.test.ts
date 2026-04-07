import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DgiiSoapClient } from '../../src/soap/client.js';
import {
  DgiiConnectionError,
  DgiiNotFoundError,
  DgiiServiceError,
} from '../../src/soap/errors.js';

function wrapInSoap(tagName: string, content: string): string {
  return (
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">' +
    '<soap:Body>' +
    `<${tagName}Response xmlns="http://dgii.gov.do/">` +
    `<${tagName}Result>${content}</${tagName}Result>` +
    `</${tagName}Response>` +
    '</soap:Body>' +
    '</soap:Envelope>'
  );
}

const MOCK_CONTRIBUYENTE_JSON = JSON.stringify({
  RGE_RUC: '131098193',
  RGE_NOMBRE: 'EMPRESA EJEMPLO SRL',
  NOMBRE_COMERCIAL: 'EJEMPLO',
  CATEGORIA: '0',
  REGIMEN_PAGOS: '2',
  ESTATUS: '2',
});

const MOCK_NCF_JSON = JSON.stringify({ ES_VALIDO: true });

describe('DgiiSoapClient', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // --- Constructor tests ---

  it('se puede instanciar sin opciones', () => {
    const client = new DgiiSoapClient();
    expect(client).toBeInstanceOf(DgiiSoapClient);
  });

  it('se puede instanciar con opciones personalizadas', () => {
    const client = new DgiiSoapClient({
      timeout: 5000,
      baseUrl: 'https://custom.url/soap',
    });
    expect(client).toBeInstanceOf(DgiiSoapClient);
  });

  it('clamps timeout negativo al minimo de 1000ms', () => {
    const client = new DgiiSoapClient({ timeout: -1 });
    expect(client).toBeInstanceOf(DgiiSoapClient);
  });

  it('clamps timeout NaN al minimo de 1000ms', () => {
    const client = new DgiiSoapClient({ timeout: NaN });
    expect(client).toBeInstanceOf(DgiiSoapClient);
  });

  it('rechaza baseUrl que no usa HTTPS', () => {
    expect(
      () => new DgiiSoapClient({ baseUrl: 'http://insecure.example.com/soap' }),
    ).toThrow('baseUrl debe usar HTTPS');
  });

  // --- getContribuyente tests ---

  it('retorna contribuyente para RNC valido', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        wrapInSoap('GetContribuyentes', MOCK_CONTRIBUYENTE_JSON),
        { status: 200 },
      ),
    );

    const client = new DgiiSoapClient();
    const result = await client.getContribuyente('131098193');

    expect(result.rnc).toBe('131098193');
    expect(result.nombre).toBe('EMPRESA EJEMPLO SRL');
    expect(result.estado).toBe('ACTIVO');
  });

  it('lanza DgiiNotFoundError cuando DGII retorna "0"', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(wrapInSoap('GetContribuyentes', '0'), { status: 200 }),
    );

    const client = new DgiiSoapClient();
    await expect(client.getContribuyente('000000000')).rejects.toThrow(
      DgiiNotFoundError,
    );
  });

  it('lanza DgiiServiceError para HTTP 403', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('', { status: 403 }),
    );

    const client = new DgiiSoapClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiServiceError,
    );

    try {
      await client.getContribuyente('131098193');
    } catch (err) {
      expect((err as DgiiServiceError).statusCode).toBe(403);
    }
  });

  it('lanza DgiiServiceError para HTTP 500', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('', { status: 500 }),
    );

    const client = new DgiiSoapClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiServiceError,
    );
  });

  it('lanza DgiiConnectionError para error de red', async () => {
    global.fetch = vi.fn().mockRejectedValue(
      new TypeError('fetch failed'),
    );

    const client = new DgiiSoapClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiConnectionError,
    );
  });

  it('lanza DgiiConnectionError para timeout (TimeoutError)', async () => {
    const timeoutError = new DOMException('signal timed out', 'TimeoutError');
    global.fetch = vi.fn().mockRejectedValue(timeoutError);

    const client = new DgiiSoapClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiConnectionError,
    );
  });

  it('lanza DgiiConnectionError para timeout envuelto en TypeError', async () => {
    const cause = new DOMException('signal timed out', 'TimeoutError');
    const wrappedError = new TypeError('fetch failed');
    Object.defineProperty(wrappedError, 'cause', { value: cause });
    global.fetch = vi.fn().mockRejectedValue(wrappedError);

    const client = new DgiiSoapClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiConnectionError,
    );
  });

  it('lanza DgiiConnectionError para AbortError directo', async () => {
    const abortError = new DOMException('aborted', 'AbortError');
    global.fetch = vi.fn().mockRejectedValue(abortError);

    const client = new DgiiSoapClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiConnectionError,
    );
  });

  it('lanza DgiiServiceError para respuesta con Content-Length excesivo', async () => {
    const headers = new Headers();
    headers.set('content-length', '2000000');
    global.fetch = vi.fn().mockResolvedValue(
      new Response('', { status: 200, headers }),
    );

    const client = new DgiiSoapClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      DgiiServiceError,
    );
  });

  it('sanitiza JSON con newlines literales', async () => {
    const json = '{"RGE_RUC":"123","RGE_NOMBRE":"FOO\nBAR","NOMBRE_COMERCIAL":"","CATEGORIA":"0","ESTATUS":"2"}';
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        wrapInSoap('GetContribuyentes', json),
        { status: 200 },
      ),
    );

    const client = new DgiiSoapClient();
    const result = await client.getContribuyente('123');
    expect(result.rnc).toBe('123');
  });

  it('escapa XML en el valor del RNC', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        wrapInSoap('GetContribuyentes', MOCK_CONTRIBUYENTE_JSON),
        { status: 200 },
      ),
    );

    const client = new DgiiSoapClient();
    await client.getContribuyente('<script>');

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const body = fetchCall[1].body as string;
    expect(body).toContain('&lt;script&gt;');
    expect(body).not.toContain('<script>');
  });

  it('lanza DgiiServiceError para input vacio', async () => {
    const client = new DgiiSoapClient();
    await expect(client.getContribuyente('')).rejects.toThrow(
      DgiiServiceError,
    );
  });

  // --- getNCF tests ---

  it('retorna valid true para NCF valido', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(wrapInSoap('GetNCF', MOCK_NCF_JSON), { status: 200 }),
    );

    const client = new DgiiSoapClient();
    const result = await client.getNCF('131098193', 'B0100000001');
    expect(result.valid).toBe(true);
  });

  it('retorna valid false cuando DGII retorna "0"', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(wrapInSoap('GetNCF', '0'), { status: 200 }),
    );

    const client = new DgiiSoapClient();
    const result = await client.getNCF('131098193', 'B0100000001');
    expect(result.valid).toBe(false);
  });

  it('lanza DgiiServiceError para rnc vacio en getNCF', async () => {
    const client = new DgiiSoapClient();
    await expect(client.getNCF('', 'B0100000001')).rejects.toThrow(
      DgiiServiceError,
    );
  });

  it('lanza DgiiServiceError para ncf vacio en getNCF', async () => {
    const client = new DgiiSoapClient();
    await expect(client.getNCF('131098193', '')).rejects.toThrow(
      DgiiServiceError,
    );
  });
});
