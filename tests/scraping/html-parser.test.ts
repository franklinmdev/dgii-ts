import { describe, it, expect } from 'vitest';
import {
  extractViewStateTokens,
  parseContribuyenteHtml,
  parseNcfHtml,
} from '../../src/scraping/html-parser.js';
import { DgiiNotFoundError, DgiiServiceError } from '../../src/errors/index.js';

const MOCK_VIEWSTATE = 'dGVzdHZpZXdzdGF0ZQ==';
const MOCK_EVENT_VALIDATION = 'dGVzdGV2ZW50dmFsaWQ=';

function buildPageHtml(
  viewState: string,
  eventValidation: string,
): string {
  return (
    '<html><body>' +
    `<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="${viewState}" />` +
    '<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="4F4BAA71" />' +
    `<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="${eventValidation}" />` +
    '</body></html>'
  );
}

function buildResultHtml(fields: Array<[string, string]>): string {
  const rows = fields
    .map(
      ([label, value]) =>
        `<tr><td style="font-weight:bold;">${label}</td><td>${value}</td></tr>`,
    )
    .join('');

  return (
    '<html><body>' +
    `<input type="hidden" name="__VIEWSTATE" value="${MOCK_VIEWSTATE}" />` +
    '<input type="hidden" name="__VIEWSTATEGENERATOR" value="4F4BAA71" />' +
    `<input type="hidden" name="__EVENTVALIDATION" value="${MOCK_EVENT_VALIDATION}" />` +
    '<span id="cphMain_lblInformacion"></span>' +
    '<div id="cphMain_divBusqueda" style="display:Block;">' +
    `<table id="cphMain_dvDatosContribuyentes">${rows}</table>` +
    '</div></body></html>'
  );
}

function buildNotFoundHtml(): string {
  return (
    '<html><body>' +
    '<span id="cphMain_lblInformacion">El RNC/C&#233;dula consultado no se encuentra inscrito como Contribuyente.</span>' +
    '</body></html>'
  );
}

describe('extractViewStateTokens', () => {
  it('extrae tokens de HTML valido', () => {
    const html = buildPageHtml(MOCK_VIEWSTATE, MOCK_EVENT_VALIDATION);
    const tokens = extractViewStateTokens(html);
    expect(tokens.viewState).toBe(MOCK_VIEWSTATE);
    expect(tokens.viewStateGenerator).toBe('4F4BAA71');
    expect(tokens.eventValidation).toBe(MOCK_EVENT_VALIDATION);
  });

  it('lanza DgiiServiceError si no encuentra tokens', () => {
    expect(() => extractViewStateTokens('<html></html>')).toThrow(
      DgiiServiceError,
    );
  });
});

describe('parseContribuyenteHtml', () => {
  it('parsea tabla con todos los campos', () => {
    const html = buildResultHtml([
      ['Cedula/RNC', '131-09819-3'],
      ['Nombre/Razon Social', 'EMPRESA EJEMPLO SRL'],
      ['Nombre Comercial', 'EJEMPLO'],
      ['Categoria', ''],
      ['Regimen de pagos', 'NORMAL'],
      ['Estado', 'ACTIVO'],
      ['Actividad Economica', 'COMERCIO'],
      ['Administracion Local', 'ADM LOCAL GGC'],
    ]);

    const result = parseContribuyenteHtml(html);
    expect(result.rnc).toBe('131098193');
    expect(result.nombre).toBe('EMPRESA EJEMPLO SRL');
    expect(result.nombreComercial).toBe('EJEMPLO');
    expect(result.estado).toBe('ACTIVO');
    expect(result.actividadEconomica).toBe('COMERCIO');
    expect(result.regimenDePagos).toBe('NORMAL');
    expect(result.administracionLocal).toBe('ADM LOCAL GGC');
  });

  it('mapea estado Suspendido a INACTIVO', () => {
    const html = buildResultHtml([
      ['Cedula/RNC', '123456789'],
      ['Nombre/Razon Social', 'TEST'],
      ['Nombre Comercial', ''],
      ['Estado', 'Suspendido'],
    ]);

    const result = parseContribuyenteHtml(html);
    expect(result.estado).toBe('INACTIVO');
  });

  it('strip dashes del RNC', () => {
    const html = buildResultHtml([
      ['Cedula/RNC', '401-50625-4'],
      ['Nombre/Razon Social', 'TEST'],
      ['Nombre Comercial', ''],
      ['Estado', 'ACTIVO'],
    ]);

    const result = parseContribuyenteHtml(html);
    expect(result.rnc).toBe('401506254');
  });

  it('colapsa espacios dobles', () => {
    const html = buildResultHtml([
      ['Cedula/RNC', '123456789'],
      ['Nombre/Razon Social', 'FOO  BAR  SRL'],
      ['Nombre Comercial', ''],
      ['Estado', 'ACTIVO'],
    ]);

    const result = parseContribuyenteHtml(html);
    expect(result.nombre).toBe('FOO BAR SRL');
  });

  it('lanza DgiiNotFoundError para RNC no encontrado', () => {
    const html = buildNotFoundHtml();
    expect(() => parseContribuyenteHtml(html)).toThrow(
      DgiiNotFoundError,
    );
  });

  it('lanza DgiiServiceError si tabla no existe', () => {
    const html = '<html><body><span id="cphMain_lblInformacion"></span></body></html>';
    expect(() => parseContribuyenteHtml(html)).toThrow(
      DgiiServiceError,
    );
  });

  it('maneja tabla incompleta sin cierre', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosContribuyentes">' +
      '<tr><td style="font-weight:bold;">Cedula/RNC</td><td>123</td></tr>';

    expect(() => parseContribuyenteHtml(html)).toThrow(DgiiServiceError);
  });

  it('maneja campos opcionales ausentes', () => {
    const html = buildResultHtml([
      ['Cedula/RNC', '123456789'],
      ['Nombre/Razon Social', 'TEST'],
      ['Nombre Comercial', ''],
      ['Estado', 'ACTIVO'],
    ]);

    const result = parseContribuyenteHtml(html);
    expect(result.actividadEconomica).toBeUndefined();
    expect(result.regimenDePagos).toBeUndefined();
    expect(result.administracionLocal).toBeUndefined();
  });

  it('decodifica entidades HTML en labels', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosContribuyentes">' +
      '<tr><td style="font-weight:bold;">C&#233;dula/RNC</td><td>123-456-789</td></tr>' +
      '<tr><td style="font-weight:bold;">Nombre/Raz&#243;n Social</td><td>TEST</td></tr>' +
      '<tr><td style="font-weight:bold;">Nombre Comercial</td><td></td></tr>' +
      '<tr><td style="font-weight:bold;">Estado</td><td>ACTIVO</td></tr>' +
      '</table></body></html>';

    const result = parseContribuyenteHtml(html);
    expect(result.rnc).toBe('123456789');
    expect(result.nombre).toBe('TEST');
  });

  it('parsea variante con <b> en vez de font-weight', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosContribuyentes">' +
      '<tr><td><b>Cedula/RNC</b></td><td>123-456-789</td></tr>' +
      '<tr><td><b>Nombre/Razon Social</b></td><td>TEST SRL</td></tr>' +
      '<tr><td><b>Nombre Comercial</b></td><td></td></tr>' +
      '<tr><td><b>Estado</b></td><td>ACTIVO</td></tr>' +
      '</table></body></html>';

    const result = parseContribuyenteHtml(html);
    expect(result.rnc).toBe('123456789');
    expect(result.nombre).toBe('TEST SRL');
  });

  it('usa label alternativo "RNC" cuando "Cedula/RNC" no existe', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosContribuyentes">' +
      '<tr><td style="font-weight:bold;">RNC</td><td>123-456-789</td></tr>' +
      '<tr><td style="font-weight:bold;">Nombre / Razon Social</td><td>ALT SRL</td></tr>' +
      '<tr><td style="font-weight:bold;">Nombre Comercial</td><td></td></tr>' +
      '<tr><td style="font-weight:bold;">Estado</td><td>ACTIVO</td></tr>' +
      '</table></body></html>';

    const result = parseContribuyenteHtml(html);
    expect(result.rnc).toBe('123456789');
    expect(result.nombre).toBe('ALT SRL');
  });

  it('maneja &amp; en labels', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosContribuyentes">' +
      '<tr><td style="font-weight:bold;">Cedula/RNC</td><td>123456789</td></tr>' +
      '<tr><td style="font-weight:bold;">Nombre/Razon Social</td><td>TEST SRL</td></tr>' +
      '<tr><td style="font-weight:bold;">Nombre Comercial</td><td></td></tr>' +
      '<tr><td style="font-weight:bold;">Estado</td><td>ACTIVO</td></tr>' +
      '<tr><td style="font-weight:bold;">Actividad Economica</td><td>COMERCIO</td></tr>' +
      '</table></body></html>';

    const result = parseContribuyenteHtml(html);
    expect(result.actividadEconomica).toBe('COMERCIO');
  });

  it('retorna campos vacios si no hay match en tabla', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosContribuyentes">' +
      '<tr><td>No bold</td><td>Value</td></tr>' +
      '</table></body></html>';

    const result = parseContribuyenteHtml(html);
    expect(result.rnc).toBe('');
    expect(result.nombre).toBe('');
  });
});

describe('parseNcfHtml', () => {
  it('retorna valid false para NCF no valido', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion">El NCF digitado no es v&#225;lido.</span>' +
      '</body></html>';

    const result = parseNcfHtml(html);
    expect(result.valid).toBe(false);
  });

  it('retorna valid false si no hay tabla de resultados', () => {
    const html = '<html><body></body></html>';
    const result = parseNcfHtml(html);
    expect(result.valid).toBe(false);
  });

  it('retorna valid false para "no existe"', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion">El NCF no existe en los registros.</span>' +
      '</body></html>';

    const result = parseNcfHtml(html);
    expect(result.valid).toBe(false);
  });

  it('usa tabla alternativa cphMain_dvDatosContribuyentes para NCF', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosContribuyentes">' +
      '<tr><td style="font-weight:bold;">RNC</td><td>123456789</td></tr>' +
      '<tr><td style="font-weight:bold;">No. Comprobante Fiscal</td><td>B0100000005</td></tr>' +
      '</table></body></html>';

    const result = parseNcfHtml(html);
    expect(result.valid).toBe(true);
    expect(result.ncf).toBe('B0100000005');
  });

  it('maneja tabla NCF sin cierre', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosComprobante">' +
      '<tr><td style="font-weight:bold;">RNC</td><td>123</td></tr>';

    const result = parseNcfHtml(html);
    expect(result.valid).toBe(false);
  });

  it('retorna campos vacios cuando labels no coinciden en NCF', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosComprobante">' +
      '<tr><td style="font-weight:bold;">Otro Campo</td><td>valor</td></tr>' +
      '</table></body></html>';

    const result = parseNcfHtml(html);
    expect(result.valid).toBe(true);
    expect(result.rnc).toBe('');
    expect(result.ncf).toBe('');
    expect(result.nombreComercial).toBeUndefined();
  });

  it('usa labels alternativos Cedula/RNC y Nombre / Razon Social para NCF', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosComprobante">' +
      '<tr><td style="font-weight:bold;">Cedula/RNC</td><td>131-09819-3</td></tr>' +
      '<tr><td style="font-weight:bold;">No. Comprobante Fiscal</td><td>B0100000005</td></tr>' +
      '<tr><td style="font-weight:bold;">Nombre / Razon Social</td><td>ALT NAME</td></tr>' +
      '</table></body></html>';

    const result = parseNcfHtml(html);
    expect(result.valid).toBe(true);
    expect(result.rnc).toBe('131098193');
    expect(result.ncf).toBe('B0100000005');
    expect(result.nombreComercial).toBe('ALT NAME');
  });

  it('retorna valid true con datos del comprobante', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<table id="cphMain_dvDatosComprobante">' +
      '<tr><td style="font-weight:bold;">RNC</td><td>131-09819-3</td></tr>' +
      '<tr><td style="font-weight:bold;">Nombre Comercial</td><td>EJEMPLO</td></tr>' +
      '<tr><td style="font-weight:bold;">NCF</td><td>B0100000001</td></tr>' +
      '</table></body></html>';

    const result = parseNcfHtml(html);
    expect(result.valid).toBe(true);
    expect(result.rnc).toBe('131098193');
    expect(result.ncf).toBe('B0100000001');
    expect(result.nombreComercial).toBe('EJEMPLO');
  });
});
