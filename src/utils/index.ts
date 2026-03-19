/**
 * Elimina guiones, espacios y otros separadores de un string numérico.
 */
export function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '');
}
