import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type { BulkContribuyente, ParseOptions } from './types.js';
import { DGII_ESTADOS } from './types.js';
import { BulkFormatError } from '../errors/index.js';
import { collapseSpaces } from '../utils/index.js';

const KNOWN_ESTADOS: ReadonlySet<string> = new Set(DGII_ESTADOS);

/** Cuántas filas se muestrean para validar el formato antes de aceptarlo. */
const ESTADO_SAMPLE_SIZE = 1000;

/**
 * Parsea el archivo TXT de contribuyentes extraído de DGII_RNC.zip.
 *
 * El archivo usa delimitador pipe (|) con 11 columnas y viene codificado
 * en latin-1 (ISO-8859-1); leerlo como UTF-8 corrompe los nombres con
 * ñ/acentos (p. ej. MUÑOZ, PEÑA).
 *
 * Layout verificado contra el archivo en producción (~778k filas):
 *
 *   col  0   rnc                (100% dígitos)
 *   col  1   nombre             (razón social)
 *   col  2   nombreComercial
 *   col  3   actividad
 *   col  4-7 reservadas/vacías en el archivo actual
 *   col  8   fechaConstitucion  (dd/mm/yyyy)
 *   col  9   estado             (ACTIVO / SUSPENDIDO / DADO DE BAJA / ...)
 *   col 10   regimen            (NORMAL / RST / PST)
 *
 * Las filas con menos de 11 columnas se descartan por malformadas. Si el
 * archivo trae filas pero ninguna muestra un `estado` reconocido, se lanza
 * {@link BulkFormatError}: un cambio de layout de la DGII debe fallar
 * ruidosamente en vez de devolver `estado` vacío en silencio.
 */
export async function parseBulkFile(
  options: ParseOptions,
): Promise<BulkContribuyente[]> {
  const results: BulkContribuyente[] = [];
  let dataLines = 0;

  const rl = createInterface({
    input: createReadStream(options.filePath, { encoding: 'latin1' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim() === '') continue;
    dataLines += 1;

    const fields = line.split('|');

    // El layout real trae 11 columnas; una fila más corta está malformada
    // (o pertenece a un formato viejo) y se descarta. Tras este guard las
    // columnas 0–10 existen, así que `!` es seguro: split() nunca devuelve
    // undefined para un índice dentro del rango.
    if (fields.length < 11) continue;

    results.push({
      rnc: collapseSpaces(fields[0]!),
      nombre: collapseSpaces(fields[1]!),
      nombreComercial: collapseSpaces(fields[2]!),
      actividad: collapseSpaces(fields[3]!),
      fechaConstitucion: collapseSpaces(fields[8]!),
      estado: collapseSpaces(fields[9]!),
      regimen: collapseSpaces(fields[10]!),
    });
  }

  // Guard de formato: si llegaron filas de datos pero ninguna muestra un
  // `estado` reconocido, el layout de la DGII cambió. Un archivo vacío
  // (sin filas de datos) sigue devolviendo [].
  if (dataLines > 0) {
    const sample = results.slice(0, ESTADO_SAMPLE_SIZE);
    const reconocidos = sample.filter((r) => KNOWN_ESTADOS.has(r.estado));
    if (results.length === 0 || reconocidos.length === 0) {
      throw new BulkFormatError(
        'El archivo masivo de la DGII no coincide con el layout esperado de ' +
          '11 columnas: ninguna fila muestreada trae un `estado` reconocido ' +
          `(${DGII_ESTADOS.join(', ')}). ¿Cambió el formato del archivo?`,
      );
    }
  }

  return results;
}
