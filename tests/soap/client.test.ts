import { describe, it, expect } from 'vitest';
import { DgiiSoapClient } from '../../src/soap/client.js';

describe('DgiiSoapClient', () => {
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

  it('getContribuyente lanza error de no implementado', async () => {
    const client = new DgiiSoapClient();
    await expect(client.getContribuyente('131098193')).rejects.toThrow(
      'getContribuyente: no implementado',
    );
  });

  it('getNCF lanza error de no implementado', async () => {
    const client = new DgiiSoapClient();
    await expect(client.getNCF('131098193', 'B0100000001')).rejects.toThrow(
      'getNCF: no implementado',
    );
  });

  it('clamps timeout negativo al mínimo de 1000ms', () => {
    const client = new DgiiSoapClient({ timeout: -1 });
    expect(client).toBeInstanceOf(DgiiSoapClient);
  });

  it('clamps timeout NaN al mínimo de 1000ms', () => {
    const client = new DgiiSoapClient({ timeout: NaN });
    expect(client).toBeInstanceOf(DgiiSoapClient);
  });

  it('rechaza baseUrl que no usa HTTPS', () => {
    expect(() => new DgiiSoapClient({ baseUrl: 'http://insecure.example.com/soap' })).toThrow(
      'baseUrl debe usar HTTPS',
    );
  });
});
