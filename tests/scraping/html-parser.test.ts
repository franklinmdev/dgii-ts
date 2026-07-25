import { describe, it, expect } from 'vitest';
import {
  extractViewStateTokens,
  parseContribuyenteHtml,
  parseNcfHtml,
  parseEcfHtml,
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
  it('extrae tokens de HTML válido', () => {
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

  it('retorna campos vacíos si no hay match en tabla', () => {
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

  it('extrae esFacturadorElectronico=true cuando fila dice SI', () => {
    const html = buildResultHtml([
      ['Cedula/RNC', '401-50625-4'],
      ['Nombre/Razon Social', 'DIRECCION GENERAL DE IMPUESTOS INTERNOS'],
      ['Nombre Comercial', 'DGII'],
      ['Estado', 'ACTIVO'],
      ['Facturador Electr&#243;nico', 'SI'],
    ]);

    const result = parseContribuyenteHtml(html);
    expect(result.esFacturadorElectronico).toBe(true);
  });

  it('extrae esFacturadorElectronico=false cuando fila dice NO', () => {
    const html = buildResultHtml([
      ['Cedula/RNC', '131-09819-3'],
      ['Nombre/Razon Social', 'EMPRESA EJEMPLO SRL'],
      ['Nombre Comercial', 'EJEMPLO'],
      ['Estado', 'ACTIVO'],
      ['Facturador Electr&#243;nico', 'NO'],
    ]);

    const result = parseContribuyenteHtml(html);
    expect(result.esFacturadorElectronico).toBe(false);
  });

  it('esFacturadorElectronico=false cuando la fila no existe', () => {
    const html = buildResultHtml([
      ['Cedula/RNC', '123456789'],
      ['Nombre/Razon Social', 'TEST'],
      ['Nombre Comercial', ''],
      ['Estado', 'ACTIVO'],
    ]);

    const result = parseContribuyenteHtml(html);
    expect(result.esFacturadorElectronico).toBe(false);
  });
});

describe('parseNcfHtml', () => {
  it('retorna valid false para NCF no válido', () => {
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

  it('retorna campos vacíos cuando labels no coinciden en NCF', () => {
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

describe('parseEcfHtml', () => {
  function validEcfHtml(
    overrides?: Record<string, string>,
  ): string {
    const rncEmisor = overrides?.rncEmisor ?? '101010632';
    const rncComprador = overrides?.rncComprador ?? '131262414';
    const encf = overrides?.encf ?? 'E310125217173';
    const codSeg = overrides?.codSeg ?? 'KrOLI0';
    const estado = overrides?.estado ?? 'Aceptado';
    const montoTotal = overrides?.montoTotal ?? '230677.74';
    const totalItbis = overrides?.totalItbis ?? '35188.13';
    const fechaEmision = overrides?.fechaEmision ?? '2026-02-11';
    const fechaFirma = overrides?.fechaFirma ?? '2026-02-11';

    return (
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<div id="cphMain_PResultadoFE">' +
      '<table class="table table-striped detailview">' +
      '<tr><th>Rnc Emisor</th><td><span id="cphMain_lblrncemisor">' + rncEmisor + '</span></td></tr>' +
      '<tr><th>Rnc Comprador</th><td><span id="cphMain_lblrnccomprador">' + rncComprador + '</span></td></tr>' +
      '<tr><th>e-NCF</th><td><span id="cphMain_lblencf">' + encf + '</span></td></tr>' +
      '<tr><th>C&#243;digo de Seguridad</th><td><span id="cphMain_lblCodSeguridad">' + codSeg + '</span></td></tr>' +
      '<tr><th>Estado</th><td><span id="cphMain_lblEstadoFe">' + estado + '</span></td></tr>' +
      '<tr><th>Monto Total</th><td><span id="cphMain_lblMontoTotal">' + montoTotal + '</span></td></tr>' +
      '<tr><th>Total de ITBIS</th><td><span id="cphMain_lblTotalItbis">' + totalItbis + '</span></td></tr>' +
      '<tr><th>Fecha Emisi&#243;n</th><td><span id="cphMain_lblFechaEmision">' + fechaEmision + '</span></td></tr>' +
      '<tr><th>Fecha de Firma</th><td><span id="cphMain_lblFechaFirma">' + fechaFirma + '</span></td></tr>' +
      '</table></div></body></html>'
    );
  }

  it('retorna valid false para e-NCF no válido', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion">El NCF digitado no es v&#225;lido.</span>' +
      '</body></html>';

    const result = parseEcfHtml(html);
    expect(result.valid).toBe(false);
  });

  it('retorna valid false si no hay PResultadoFE', () => {
    const html = '<html><body></body></html>';
    const result = parseEcfHtml(html);
    expect(result.valid).toBe(false);
  });

  it('parsea e-NCF válido con todos los campos', () => {
    const result = parseEcfHtml(validEcfHtml());
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

  it('strip non-digits del rnc y rncComprador', () => {
    const html = validEcfHtml({ rncEmisor: '101-01063-2', rncComprador: '131-26241-4' });
    const result = parseEcfHtml(html);
    expect(result.rnc).toBe('101010632');
    expect(result.rncComprador).toBe('131262414');
  });

  it('retorna campos undefined cuando no están presentes', () => {
    const html =
      '<html><body>' +
      '<span id="cphMain_lblInformacion"></span>' +
      '<div id="cphMain_PResultadoFE">' +
      '<table><tr><th>Rnc Emisor</th><td><span id="cphMain_lblrncemisor">101010632</span></td></tr>' +
      '<tr><th>e-NCF</th><td><span id="cphMain_lblencf">E310125217173</span></td></tr>' +
      '</table></div></body></html>';

    const result = parseEcfHtml(html);
    expect(result.valid).toBe(true);
    expect(result.rnc).toBe('101010632');
    expect(result.ncf).toBe('E310125217173');
    expect(result.rncComprador).toBeUndefined();
    expect(result.codigoSeguridad).toBeUndefined();
    expect(result.estado).toBeUndefined();
    expect(result.montoTotal).toBeUndefined();
    expect(result.totalItbis).toBeUndefined();
    expect(result.fechaEmision).toBeUndefined();
    expect(result.fechaFirma).toBeUndefined();
  });

  it('parsea montoTotal con formato numérico con comas', () => {
    const html = validEcfHtml({ montoTotal: '1,230,677.74' });
    const result = parseEcfHtml(html);
    expect(result.montoTotal).toBe(1230677.74);
  });
});
