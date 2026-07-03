// Estimador de fortaleza de passwords. Basado en entropia teorica del pool
// (Shannon) con castigos por patrones comunes (repetidos, secuencias,
// solo digitos, muy corto).
//
// NOTA de honestidad: entropia de pool asume password aleatorio. Passwords
// humanos NO son aleatorios — esta metrica es una cota SUPERIOR y por lo
// tanto optimista. Para produccion consideraremos integrar zxcvbn en Fase 6
// (agrega analisis de dictionary + patrones humanos). Por ahora, esta
// version pura evita dependencias externas y es util para el generador.

import { DIGITS, LOWERCASE, SYMBOLS, UPPERCASE } from "./alphabets";

export type StrengthLabel = "very_weak" | "weak" | "fair" | "strong" | "very_strong";

export interface PasswordStrength {
  entropyBits: number;
  score: 0 | 1 | 2 | 3 | 4;
  label: StrengthLabel;
  /** Tiempo estimado de crackeo en segundos asumiendo 10^11 hashes/seg (GPU moderna). */
  crackSecondsFast: number;
  /** Tiempo estimado en segundos asumiendo 10^6 hashes/seg (hash costoso + online). */
  crackSecondsSlow: number;
  /** Formato legible del tiempo de crack lento (mas conservador para el usuario). */
  crackDisplay: string;
  warnings: string[];
}

const GUESSES_PER_SEC_FAST = 1e11;
const GUESSES_PER_SEC_SLOW = 1e6;

function poolSize(password: string): number {
  let size = 0;
  if (password.split("").some((c) => LOWERCASE.includes(c))) size += LOWERCASE.length;
  if (password.split("").some((c) => UPPERCASE.includes(c))) size += UPPERCASE.length;
  if (password.split("").some((c) => DIGITS.includes(c))) size += DIGITS.length;
  if (password.split("").some((c) => SYMBOLS.includes(c))) size += SYMBOLS.length;

  // Any other chars (unicode, etc): sumar aproximado.
  if (password.split("").some((c) => !LOWERCASE.includes(c) && !UPPERCASE.includes(c) && !DIGITS.includes(c) && !SYMBOLS.includes(c))) {
    size += 32; // conservador
  }

  return Math.max(size, 1);
}

function detectPatterns(password: string, warnings: string[]): number {
  let penalty = 0;

  if (password.length < 8) warnings.push("Longitud minima recomendada: 12 caracteres");

  // Todos iguales
  if (/^(.)\1+$/.test(password)) {
    warnings.push("Password de un solo caracter repetido");
    penalty += 20;
  }

  // Solo digitos
  if (/^\d+$/.test(password)) {
    warnings.push("Solo digitos — vulnerable a fuerza bruta rapida");
    penalty += 15;
  }

  // Secuencia obvia
  const sequences = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const lower = password.toLowerCase();
  for (const seq of sequences) {
    for (let i = 0; i < seq.length - 3; i++) {
      const chunk = seq.substring(i, i + 4);
      if (lower.includes(chunk) || lower.includes(chunk.split("").reverse().join(""))) {
        warnings.push(`Contiene secuencia comun: ${chunk}`);
        penalty += 10;
        break;
      }
    }
  }

  // Repeticion larga
  if (/(.)\1{2,}/.test(password)) {
    warnings.push("Contiene 3+ caracteres repetidos consecutivos");
    penalty += 8;
  }

  return penalty;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "eones";
  if (seconds < 1) return "instantaneo";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const mins = seconds / 60;
  if (mins < 60) return `${Math.round(mins)} min`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)} h`;
  const days = hours / 24;
  if (days < 365) return `${Math.round(days)} dias`;
  const years = days / 365;
  if (years < 1e3) return `${Math.round(years)} anos`;
  if (years < 1e6) return `${Math.round(years / 1e3)} mil anos`;
  if (years < 1e9) return `${Math.round(years / 1e6)} millones de anos`;
  return `${(years / 1e9).toExponential(1)} mil millones de anos`;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const warnings: string[] = [];

  if (password.length === 0) {
    return {
      entropyBits: 0,
      score: 0,
      label: "very_weak",
      crackSecondsFast: 0,
      crackSecondsSlow: 0,
      crackDisplay: "instantaneo",
      warnings: ["Password vacio"],
    };
  }

  const pool = poolSize(password);
  const rawEntropy = password.length * Math.log2(pool);
  const penalty = detectPatterns(password, warnings);
  const entropyBits = Math.max(0, rawEntropy - penalty);

  // Score buckets basados en entropia con castigo.
  let score: 0 | 1 | 2 | 3 | 4;
  let label: StrengthLabel;
  if (entropyBits < 28) {
    score = 0;
    label = "very_weak";
  } else if (entropyBits < 40) {
    score = 1;
    label = "weak";
  } else if (entropyBits < 60) {
    score = 2;
    label = "fair";
  } else if (entropyBits < 80) {
    score = 3;
    label = "strong";
  } else {
    score = 4;
    label = "very_strong";
  }

  const guesses = Math.pow(2, entropyBits);
  const crackSecondsFast = guesses / GUESSES_PER_SEC_FAST;
  const crackSecondsSlow = guesses / GUESSES_PER_SEC_SLOW;

  return {
    entropyBits,
    score,
    label,
    crackSecondsFast,
    crackSecondsSlow,
    crackDisplay: formatDuration(crackSecondsSlow),
    warnings,
  };
}
