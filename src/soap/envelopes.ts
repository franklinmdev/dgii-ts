import { escapeXml } from './xml.js';

const SOAP_HEADER =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<soap12:Envelope' +
  ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
  ' xmlns:xsd="http://www.w3.org/2001/XMLSchema"' +
  ' xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' +
  '<soap12:Body>';

const SOAP_FOOTER = '</soap12:Body></soap12:Envelope>';

/**
 * Construye el envelope SOAP para GetContribuyentes.
 */
export function buildGetContribuyentesEnvelope(value: string): string {
  return (
    SOAP_HEADER +
    '<GetContribuyentes xmlns="http://dgii.gov.do/">' +
    `<value>${escapeXml(value)}</value>` +
    '<patronBusqueda>0</patronBusqueda>' +
    '<inicioFilas>1</inicioFilas>' +
    '<filaFilas>1</filaFilas>' +
    '<IMEI></IMEI>' +
    '</GetContribuyentes>' +
    SOAP_FOOTER
  );
}

/**
 * Construye el envelope SOAP para GetNCF.
 */
export function buildGetNcfEnvelope(rnc: string, ncf: string): string {
  return (
    SOAP_HEADER +
    '<GetNCF xmlns="http://dgii.gov.do/">' +
    `<RNC>${escapeXml(rnc)}</RNC>` +
    `<NCF>${escapeXml(ncf)}</NCF>` +
    '<IMEI></IMEI>' +
    '</GetNCF>' +
    SOAP_FOOTER
  );
}
