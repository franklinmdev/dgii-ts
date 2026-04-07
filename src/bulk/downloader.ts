import { get } from 'node:https';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { join } from 'node:path';
import { DGII_BULK_URL } from './types.js';
import type { DownloadOptions } from './types.js';

/**
 * Descarga el archivo masivo DGII_RNC.zip desde el portal de la DGII.
 *
 * @returns Ruta absoluta al archivo ZIP descargado
 */
export async function downloadBulkFile(
  options: DownloadOptions,
): Promise<string> {
  const timeout = Math.min(
    Math.max(options.timeout ?? 60_000, 5_000),
    600_000,
  );
  const destPath = join(options.outputDir, 'DGII_RNC.zip');

  return new Promise<string>((resolve, reject) => {
    const req = get(DGII_BULK_URL, (response) => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 307, 308].includes(status)) {
        const redirectUrl = response.headers['location'];
        if (redirectUrl) {
          // Seguir un redirect (la DGII a veces redirige HTTP->HTTPS)
          response.resume(); // drenar la respuesta actual
          const req2 = get(redirectUrl, (res2) => {
            handleResponse(res2, destPath, resolve, reject);
          });
          req2.on('error', (err) => reject(
            new Error('Error de conexión al descargar archivo masivo', {
              cause: err,
            }),
          ));
          return;
        }
      }
      handleResponse(response, destPath, resolve, reject);
    });

    req.on('error', (err) => reject(
      new Error('Error de conexión al descargar archivo masivo', {
        cause: err,
      }),
    ));

    // Tiempo de espera
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(
        `Timeout de ${timeout}ms excedido al descargar archivo masivo`,
      ));
    });
  });
}

function handleResponse(
  response: import('node:http').IncomingMessage,
  destPath: string,
  resolve: (value: string) => void,
  reject: (reason: unknown) => void,
): void {
  if (response.statusCode !== 200) {
    response.resume();
    reject(new Error(
      `La DGII respondió con HTTP ${response.statusCode ?? 'desconocido'} ` +
      'al descargar el archivo masivo',
    ));
    return;
  }

  const fileStream = createWriteStream(destPath);
  pipeline(response, fileStream)
    .then(() => resolve(destPath))
    .catch((err) => reject(
      new Error('Error al escribir archivo masivo', { cause: err }),
    ));
}
