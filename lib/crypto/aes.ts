// Cifrado y descifrado simetrico con AES-256-GCM.
// GCM da confidencialidad + autenticidad en un solo paso (si el ciphertext
// o el IV se modifican, decrypt tira DOMException — no hay que verificar
// MAC manual).

import { AES_ALGORITHM } from "./constants";
import { base64ToBytes, bytesToBase64 } from "./base64";
import { generateIv } from "./random";

export interface CipherEnvelope {
  /** Ciphertext AES-GCM (incluye el authentication tag al final), base64. */
  ciphertext: string;
  /** IV usado en esta operacion. Se guarda junto al ciphertext, base64. */
  iv: string;
}

/**
 * Cifra bytes crudos con AES-GCM y una master key derivada previamente.
 * Cada llamada usa un IV NUEVO aleatorio — nunca reutilizado con la misma key.
 */
export async function encryptBytes(
  key: CryptoKey,
  plaintext: Uint8Array,
): Promise<CipherEnvelope> {
  const iv = generateIv();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv: iv as BufferSource },
    key,
    plaintext as BufferSource,
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64(iv),
  };
}

/**
 * Descifra un envelope previamente cifrado. Falla con DOMException
 * ("OperationError") si:
 *  - La key es distinta de la usada al cifrar.
 *  - El IV no corresponde al ciphertext.
 *  - El ciphertext fue modificado (auth tag no valida).
 */
export async function decryptBytes(key: CryptoKey, envelope: CipherEnvelope): Promise<Uint8Array> {
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );
  return new Uint8Array(plaintextBuffer);
}
