import { describe, it, expect } from 'vitest';
import { parseContribuyenteResponse, parseNcfResponse } from '../../src/soap/parser.js';
import { DgiiNotFoundError, DgiiServiceError } from '../../src/soap/errors.js';

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

describe('parseContribuyenteResponse', () => {
  it('parsea JSON de la DGII', () => {
    const json = JSON.stringify({
      RGE_RUC: '131098193',
      RGE_NOMBRE: 'EMPRESA EJEMPLO SRL',
      NOMBRE_COMERCIAL: 'EJEMPLO',
      CATEGORIA: '0',
      REGIMEN_PAGOS: '2',
      ESTATUS: '2',
    });
    const result = parseContribuyenteResponse(
      wrapInSoap('GetContribuyentes', json),
    );
    expect(result.rnc).toBe('131098193');
    expect(result.nombre).toBe('EMPRESA EJEMPLO SRL');
    expect(result.nombreComercial).toBe('EJEMPLO');
    expect(result.estado).toBe('ACTIVO');
    expect(result.categoria).toBe('0');
  });

  it('lanza DgiiNotFoundError para "0"', () => {
    expect(() =>
      parseContribuyenteResponse(wrapInSoap('GetContribuyentes', '0')),
    ).toThrow(DgiiNotFoundError);
  });

  it('sanitiza newlines en JSON', () => {
    const json = '{"RGE_RUC":"123","RGE_NOMBRE":"FOO\nBAR","NOMBRE_COMERCIAL":"","CATEGORIA":"0","ESTATUS":"2"}';
    const result = parseContribuyenteResponse(
      wrapInSoap('GetContribuyentes', json),
    );
    expect(result.rnc).toBe('123');
  });

  it('lanza DgiiServiceError para tag faltante', () => {
    expect(() =>
      parseContribuyenteResponse('<soap:Body></soap:Body>'),
    ).toThrow(DgiiServiceError);
  });

  it('colapsa espacios dobles en nombres', () => {
    const json = JSON.stringify({
      RGE_RUC: '123',
      RGE_NOMBRE: 'FOO  BAR  SRL',
      NOMBRE_COMERCIAL: '',
      CATEGORIA: '0',
      ESTATUS: '2',
    });
    const result = parseContribuyenteResponse(
      wrapInSoap('GetContribuyentes', json),
    );
    expect(result.nombre).toBe('FOO BAR SRL');
  });

  it('mapea ESTATUS 2 a ACTIVO', () => {
    const json = JSON.stringify({
      RGE_RUC: '123',
      RGE_NOMBRE: 'TEST',
      NOMBRE_COMERCIAL: '',
      CATEGORIA: '0',
      ESTATUS: '2',
    });
    const result = parseContribuyenteResponse(
      wrapInSoap('GetContribuyentes', json),
    );
    expect(result.estado).toBe('ACTIVO');
  });

  it('lanza DgiiServiceError para JSON invalido', () => {
    expect(() =>
      parseContribuyenteResponse(
        wrapInSoap('GetContribuyentes', '{not valid json'),
      ),
    ).toThrow(DgiiServiceError);
  });

  it('lanza DgiiServiceError para formato inesperado sin RGE_RUC', () => {
    const json = JSON.stringify({ OTHER_FIELD: 'value' });
    expect(() =>
      parseContribuyenteResponse(wrapInSoap('GetContribuyentes', json)),
    ).toThrow(DgiiServiceError);
  });

  it('maneja campos faltantes con fallback a string vacio', () => {
    const json = JSON.stringify({
      RGE_RUC: '123',
    });
    const result = parseContribuyenteResponse(
      wrapInSoap('GetContribuyentes', json),
    );
    expect(result.rnc).toBe('123');
    expect(result.nombre).toBe('');
    expect(result.nombreComercial).toBe('');
    expect(result.categoria).toBe('');
    expect(result.estado).toBe('INACTIVO');
  });

  it('mapea ESTATUS != 2 a INACTIVO', () => {
    const json = JSON.stringify({
      RGE_RUC: '123',
      RGE_NOMBRE: 'TEST',
      NOMBRE_COMERCIAL: '',
      CATEGORIA: '0',
      ESTATUS: '1',
    });
    const result = parseContribuyenteResponse(
      wrapInSoap('GetContribuyentes', json),
    );
    expect(result.estado).toBe('INACTIVO');
  });
});

describe('parseNcfResponse', () => {
  it('retorna valid true para ES_VALIDO truthy', () => {
    const json = JSON.stringify({
      ES_VALIDO: true,
      RNC: '131098193',
      NCF: 'B0100000001',
      NOMBRE_COMERCIAL: 'TEST',
    });
    const result = parseNcfResponse(wrapInSoap('GetNCF', json));
    expect(result.valid).toBe(true);
    expect(result.rnc).toBe('131098193');
    expect(result.ncf).toBe('B0100000001');
    expect(result.nombreComercial).toBe('TEST');
  });

  it('retorna valid false para "0"', () => {
    const result = parseNcfResponse(wrapInSoap('GetNCF', '0'));
    expect(result.valid).toBe(false);
    expect(result.rnc).toBe('');
    expect(result.ncf).toBe('');
  });

  it('lanza DgiiServiceError para tag faltante', () => {
    expect(() =>
      parseNcfResponse('<soap:Body></soap:Body>'),
    ).toThrow(DgiiServiceError);
  });

  it('lanza DgiiServiceError para JSON invalido', () => {
    expect(() =>
      parseNcfResponse(wrapInSoap('GetNCF', '{invalid')),
    ).toThrow(DgiiServiceError);
  });

  it('lanza DgiiServiceError para formato inesperado', () => {
    expect(() =>
      parseNcfResponse(wrapInSoap('GetNCF', '"just a string"')),
    ).toThrow(DgiiServiceError);
  });

  it('retorna valid false para respuesta vacia', () => {
    const result = parseNcfResponse(wrapInSoap('GetNCF', '  '));
    expect(result.valid).toBe(false);
  });
});
