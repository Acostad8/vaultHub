// Alfabetos usados por generador y estimador de fortaleza.
// Exportados como constantes tipadas para poder calcular tamaño del pool
// sin duplicar strings.

export const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
export const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const DIGITS = "0123456789";
export const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?/|~`";

// Ambiguos entre alfabetos y digitos: 0/O, 1/l/I, 5/S, 2/Z. Excluirlos
// mejora la usabilidad al transcribir manualmente.
export const AMBIGUOUS = "0O1lI5S2Z";

export const CHAR_SETS = {
  lowercase: LOWERCASE,
  uppercase: UPPERCASE,
  digits: DIGITS,
  symbols: SYMBOLS,
} as const;

export type CharSetName = keyof typeof CHAR_SETS;
