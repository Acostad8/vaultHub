// Derivacion de la master key desde la master password del usuario.
// PBKDF2-SHA-256 con salt por usuario. La master password NUNCA sale de
// esta funcion — se convierte a bytes, se importa como CryptoKey, se
// deriva la clave AES-GCM y todas las referencias intermedias se
// descartan.

import {
  AES_ALGORITHM,
  AES_KEY_BITS,
  PBKDF2_HASH,
  PBKDF2_MIN_ITERATIONS,
} from "./constants";
import { base64ToBytes, stringToBytes } from "./base64";

export interface DeriveMasterKeyOptions {
  /** Master password del usuario (texto plano). Se limpia despues de importar. */
  password: string;
  /** Salt PBKDF2 del profile del usuario, en base64. */
  saltBase64: string;
  /** Iteraciones PBKDF2. Debe ser >= PBKDF2_MIN_ITERATIONS. */
  iterations: number;
  /**
   * Si la clave debe poder exportarse (para compartir items o backup).
   * Default false por principio de minimo privilegio.
   */
  extractable?: boolean;
}

/**
 * Deriva la master key AES-GCM del usuario.
 *
 * Errores:
 * - "Master password vacia" si password.length === 0.
 * - "Iteraciones insuficientes" si iterations < PBKDF2_MIN_ITERATIONS.
 *
 * El caller es responsable de descartar `options.password` de su ambito
 * lo antes posible (idealmente esta funcion se llama en el mismo tick
 * en que el usuario introduce la password, y la variable sale de scope).
 */
export async function deriveMasterKey(options: DeriveMasterKeyOptions): Promise<CryptoKey> {
  const { password, saltBase64, iterations, extractable = false } = options;

  if (password.length === 0) {
    throw new Error("Master password vacia");
  }
  if (!Number.isInteger(iterations) || iterations < PBKDF2_MIN_ITERATIONS) {
    throw new Error(
      `Iteraciones insuficientes: minimo ${PBKDF2_MIN_ITERATIONS}, recibido ${iterations}`,
    );
  }

  const passwordBytes = stringToBytes(password);
  const saltBytes = base64ToBytes(saltBase64);

  // Paso 1: importar la password como CryptoKey PBKDF2.
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  // Paso 2: derivar la clave AES-GCM 256 bits.
  const masterKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes as BufferSource,
      iterations,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: AES_ALGORITHM, length: AES_KEY_BITS },
    extractable,
    ["encrypt", "decrypt"],
  );

  return masterKey;
}
