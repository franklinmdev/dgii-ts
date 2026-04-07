import type { DownloadOptions } from './types.js';

/**
 * Descarga el archivo masivo DGII_RNC.zip desde el portal de la DGII.
 *
 * TODO: Implementar descarga con node:https y extracción con node:zlib.
 */
export async function downloadBulkFile(_options: DownloadOptions): Promise<string> {
  throw new Error('downloadBulkFile: no implementado.');
}
