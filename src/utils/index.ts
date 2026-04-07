/**
 * Elimina guiones, espacios y otros separadores de un string numérico.
 */
export function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Colapsa espacios múltiples a uno solo y recorta extremos.
 */
export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
