// Generacion de bytes aleatorios criptograficamente seguros.
// Usa crypto.getRandomValues (CSPRNG del navegador / Node 20+).
// NO usar Math.random para NADA relacionado con crypto.

import { AES_IV_BYTES, PBKDF2_SALT_BYTES } from "./constants";
import { bytesToBase64 } from "./base64";

function randomBytes(length: number): Uint8Array {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("randomBytes: length debe ser entero positivo");
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Genera un salt PBKDF2 nuevo. Uso: registro de usuario.
 * Devuelve bytes crudos; codificar con bytesToBase64 antes de guardar en DB.
 */
export function generateSalt(): Uint8Array {
  return randomBytes(PBKDF2_SALT_BYTES);
}

/** Igual pero directamente en base64 para persistir. */
export function generateSaltBase64(): string {
  return bytesToBase64(generateSalt());
}

/**
 * IV nuevo para una operacion AES-GCM. CRITICO: nunca reutilizar un IV
 * con la misma key. Este helper garantiza un IV aleatorio por llamada.
 */
export function generateIv(): Uint8Array {
  return randomBytes(AES_IV_BYTES);
}

/** Wrapper generico para bytes aleatorios (ej. tokens de sesion, TOTP). */
export function generateRandomBytes(length: number): Uint8Array {
  return randomBytes(length);
}
