// Generador de passwords. Todo aleatorio usa crypto.getRandomValues.
// Sin Math.random en ningun punto — seria un fallo de seguridad.

import { AMBIGUOUS, CHAR_SETS, type CharSetName } from "./alphabets";

export interface GeneratePasswordOptions {
  length: number;
  useLowercase?: boolean;
  useUppercase?: boolean;
  useDigits?: boolean;
  useSymbols?: boolean;
  /** Excluir chars ambiguos (0O1lI5S2Z). */
  excludeAmbiguous?: boolean;
  /** Al menos un char de cada set habilitado. Recomendado true. */
  requireEachSet?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<GeneratePasswordOptions, "length">> = {
  useLowercase: true,
  useUppercase: true,
  useDigits: true,
  useSymbols: true,
  excludeAmbiguous: true,
  requireEachSet: true,
};

/**
 * Devuelve un indice aleatorio uniforme en [0, poolSize) sin sesgo modulo.
 * getRandomValues rellena Uint32Array; para eliminar el sesgo se descartan
 * los valores fuera del rango multiplo del poolSize.
 */
function unbiasedIndex(poolSize: number): number {
  if (poolSize <= 0 || poolSize > 0xffffffff) {
    throw new Error("poolSize fuera de rango");
  }
  const maxAcceptable = Math.floor(0x100000000 / poolSize) * poolSize;
  const buf = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0]! < maxAcceptable) {
      return buf[0]! % poolSize;
    }
  }
}

function pickChar(pool: string): string {
  return pool.charAt(unbiasedIndex(pool.length));
}

function shuffleInPlace(chars: string[]): string[] {
  // Fisher-Yates con getRandomValues.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = unbiasedIndex(i + 1);
    const tmp = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = tmp;
  }
  return chars;
}

function stripAmbiguous(pool: string): string {
  let out = "";
  for (const ch of pool) {
    if (!AMBIGUOUS.includes(ch)) out += ch;
  }
  return out;
}

/**
 * Genera una password segun opciones. Errores:
 * - length debe ser entero >= (numero de sets habilitados si requireEachSet).
 * - Al menos un set debe estar habilitado.
 */
export function generatePassword(options: GeneratePasswordOptions): string {
  const merged = { ...DEFAULT_OPTIONS, ...options };
  const { length, excludeAmbiguous, requireEachSet } = merged;

  if (!Number.isInteger(length) || length < 1) {
    throw new Error("length debe ser entero positivo");
  }

  const enabled: CharSetName[] = [];
  if (merged.useLowercase) enabled.push("lowercase");
  if (merged.useUppercase) enabled.push("uppercase");
  if (merged.useDigits) enabled.push("digits");
  if (merged.useSymbols) enabled.push("symbols");

  if (enabled.length === 0) {
    throw new Error("Al menos un set de caracteres debe estar habilitado");
  }

  if (requireEachSet && length < enabled.length) {
    throw new Error(
      `length ${length} insuficiente: ${enabled.length} sets habilitados con requireEachSet`,
    );
  }

  const pools = enabled.map((name) => {
    const p = CHAR_SETS[name];
    return excludeAmbiguous ? stripAmbiguous(p) : p;
  });

  // Si algun pool queda vacio tras stripAmbiguous, es un error de configuracion.
  for (let i = 0; i < pools.length; i++) {
    if (pools[i]!.length === 0) {
      throw new Error(`Pool ${enabled[i]} vacio tras excluir ambiguos`);
    }
  }

  const fullPool = pools.join("");

  const chars: string[] = [];
  if (requireEachSet) {
    for (const p of pools) chars.push(pickChar(p));
  }
  while (chars.length < length) {
    chars.push(pickChar(fullPool));
  }

  return shuffleInPlace(chars).join("");
}
