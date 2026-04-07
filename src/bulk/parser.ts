import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type { BulkContribuyente, ParseOptions } from './types.js';
import { collapseSpaces } from '../utils/index.js';

/**
 * Parsea el archivo TXT de contribuyentes extraido de DGII_RNC.zip.
 *
 * El archivo usa delimitador pipe (|) con 9 columnas.
 * Los registros pueden tener espacios dobles que se limpian.
 */
export async function parseBulkFile(
  options: ParseOptions,
): Promise<BulkContribuyente[]> {
  const results: BulkContribuyente[] = [];

  const rl = createInterface({
    input: createReadStream(options.filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim() === '') continue;

    const fields = line.split('|');

    // Requerir al menos los primeros 7 campos (algunas filas pueden
    // tener menos columnas al final)
    if (fields.length < 7) continue;

    results.push({
      rnc: collapseSpaces(fields[0] ?? ''),
      nombre: collapseSpaces(fields[1] ?? ''),
      nombreComercial: collapseSpaces(fields[2] ?? ''),
      actividad: collapseSpaces(fields[6] ?? ''),
      estado: collapseSpaces(fields[5] ?? ''),
      regimen: collapseSpaces(fields[4] ?? ''),
      fechaConstitucion: collapseSpaces(fields[7] ?? ''),
    });
  }

  return results;
}
