/**
 * Escapa caracteres especiales XML para prevenir inyeccion XML.
 * DEBE aplicarse a todo valor proporcionado por el usuario antes
 * de insertarlo en plantillas SOAP.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Extrae el contenido de texto entre un par de etiquetas XML.
 * Retorna `undefined` si la etiqueta no se encuentra.
 *
 * Ejemplo: extractTagContent(xml, 'GetContribuyentesResult')
 * extrae el texto entre <GetContribuyentesResult> y
 * </GetContribuyentesResult>.
 */
export function extractTagContent(
  xml: string,
  tagName: string,
): string | undefined {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  const start = xml.indexOf(openTag);
  if (start === -1) return undefined;
  const contentStart = start + openTag.length;
  const end = xml.indexOf(closeTag, contentStart);
  if (end === -1) return undefined;
  return xml.slice(contentStart, end);
}
