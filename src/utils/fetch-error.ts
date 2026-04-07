import { DgiiConnectionError } from '../errors/index.js';

/**
 * Envuelve un error de fetch en DgiiConnectionError, detectando
 * TimeoutError y AbortError (incluyendo variantes envueltas en
 * TypeError por undici).
 */
export function wrapFetchError(
  error: unknown,
  timeoutMs: number,
): DgiiConnectionError {
  const name = (error as { name?: string }).name;
  const causeName =
    (error as { cause?: { name?: string } }).cause?.name;

  if (
    name === 'TimeoutError' ||
    causeName === 'TimeoutError' ||
    name === 'AbortError' ||
    causeName === 'AbortError'
  ) {
    return new DgiiConnectionError(
      `Timeout de ${timeoutMs}ms excedido al conectar con la DGII`,
      { cause: error },
    );
  }
  return new DgiiConnectionError(
    'Error de conexion con el servicio de la DGII',
    { cause: error },
  );
}
