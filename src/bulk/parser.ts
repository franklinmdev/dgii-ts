import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type { BulkContribuyente, ParseOptions } from './types.js';
import { DGII_ESTADOS } from './types.js';
import { BulkFormatError } from '../errors/index.js';
import { collapseSpaces } from '../utils/index.js';

const KNOWN_ESTADOS: ReadonlySet<string> = new Set(DGII_ESTADOS);

/** Número exacto de columnas del layout actual del archivo masivo. */
const EXPECTED_COLUMNS = 11;

/** Cuántas filas se muestrean para validar el formato antes de aceptarlo. */
const ESTADO_SAMPLE_SIZE = 1000;

/**
 * Fracción mínima de las filas muestreadas que debe traer un `estado`
 * reconocido para aceptar el archivo. Exigir mayoría (no un solo acierto)
 * evita que una celda casual con un valor como 'ACTIVO' en otra columna
 * deshabilite la detección de cambios de layout.
 */
const ESTADO_MIN_RECOGNIZED_RATIO = 0.5;

/** BOM de UTF-8 como codepoint (U+FEFF). */
const UTF8_BOM = '\uFEFF';

/** El BOM de UTF-8 (EF BB BF) cuando el archivo se lee como latin-1. */
const UTF8_BOM_AS_LATIN1 = '\u00EF\u00BB\u00BF';

/**
 * Quita un BOM inicial de la primera línea para que no contamine el primer
 * `rnc`: el carácter U+FEFF (si el archivo se leyó como UTF-8) o la
 * secuencia EF BB BF leída como latin-1.
 */
function stripBom(line: string): string {
  if (line.startsWith(UTF8_BOM)) return line.slice(UTF8_BOM.length);
  if (line.startsWith(UTF8_BOM_AS_LATIN1)) {
    return line.slice(UTF8_BOM_AS_LATIN1.length);
  }
  return line;
}

/**
 * Parsea el archivo TXT de contribuyentes extraído de DGII_RNC.zip.
 *
 * El archivo usa delimitador pipe (|) con 11 columnas y viene codificado
 * en latin-1 (ISO-8859-1); leerlo como UTF-8 corrompe los nombres con
 * ñ/acentos (p. ej. MUÑOZ, PEÑA). Usa {@link ParseOptions.encoding} para
 * anular la codificación si una futura versión del archivo cambia.
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
 * `estado` se normaliza a mayúsculas para que coincida con
 * {@link DGII_ESTADOS} sin importar la capitalización de la fuente.
 *
 * Las filas cuyo número de columnas no sea exactamente 11 se descartan por
 * malformadas (formato viejo más corto, o una columna añadida/insertada).
 * Si el archivo trae filas pero la mayoría de la muestra no trae un
 * `estado` reconocido, se lanza {@link BulkFormatError}: un cambio de
 * layout de la DGII debe fallar ruidosamente en vez de devolver `estado`
 * vacío o mapeado a la columna equivocada en silencio.
 */
export async function parseBulkFile(
  options: ParseOptions,
): Promise<BulkContribuyente[]> {
  const results: BulkContribuyente[] = [];
  let dataLines = 0;
  let firstLine = true;

  const rl = createInterface({
    input: createReadStream(options.filePath, {
      encoding: options.encoding ?? 'latin1',
    }),
    crlfDelay: Infinity,
  });

  for await (const rawLine of rl) {
    const line = firstLine ? stripBom(rawLine) : rawLine;
    firstLine = false;
    if (line.trim() === '') continue;
    dataLines += 1;

    const fields = line.split('|');

    // El layout real trae exactamente 11 columnas. Cualquier otro conteo
    // está malformado y se descarta; tras este guard las columnas 0–10
    // existen, así que `!` es seguro. Exigir el conteo exacto (no un
    // mínimo) hace ruidoso también un cambio que añada/inserte columnas.
    if (fields.length !== EXPECTED_COLUMNS) continue;

    results.push({
      rnc: collapseSpaces(fields[0]!),
      nombre: collapseSpaces(fields[1]!),
      nombreComercial: collapseSpaces(fields[2]!),
      actividad: collapseSpaces(fields[3]!),
      fechaConstitucion: collapseSpaces(fields[8]!),
      estado: collapseSpaces(fields[9]!).toUpperCase(),
      regimen: collapseSpaces(fields[10]!),
    });
  }

  // Guard de formato: si llegaron filas de datos pero la mayoría de la
  // muestra no trae un `estado` reconocido, el layout de la DGII cambió.
  // Un archivo vacío (sin filas de datos) sigue devolviendo [].
  if (dataLines > 0) {
    const sample = results.slice(0, ESTADO_SAMPLE_SIZE);
    const reconocidos = sample.filter((r) => KNOWN_ESTADOS.has(r.estado));
    const ratio = sample.length === 0 ? 0 : reconocidos.length / sample.length;
    if (ratio < ESTADO_MIN_RECOGNIZED_RATIO) {
      throw new BulkFormatError(
        'El archivo masivo de la DGII no coincide con el layout esperado de ' +
          '11 columnas: la mayoría de las filas muestreadas no trae un ' +
          `\`estado\` reconocido (${DGII_ESTADOS.join(', ')}). ` +
          '¿Cambió el formato del archivo?',
      );
    }
  }

  return results;
}
