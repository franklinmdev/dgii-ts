import type { BulkContribuyente, ParseOptions } from './types.js';

/**
 * Parsea el archivo TXT de contribuyentes extraído de DGII_RNC.zip.
 *
 * TODO: Implementar parseo del formato pipe-delimited de la DGII.
 */
export async function parseBulkFile(
  _options: ParseOptions,
): Promise<BulkContribuyente[]> {
  throw new Error('No implementado. Disponible en una futura versión.');
}
