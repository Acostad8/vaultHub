// Capa de alto nivel: cifra/descifra objetos JSON. Es lo que usan services
// y repositorios al persistir/leer vault_items, categorias, tags, etc.
// Deja `aes.ts` sin dependencias de JSON para poder testear ambos aparte.

import { stringToBytes, bytesToString } from "./base64";
import { encryptBytes, decryptBytes, type CipherEnvelope } from "./aes";

// Cualquier valor JSON-serializable. La API es intencionalmente laxa —
// JSON.stringify acepta unknown; la validacion del shape ocurre despues
// del descifrado con Zod, no aqui (GCM valida bytes, no estructura).
export type SerializablePayload = unknown;

/**
 * Serializa un objeto a JSON y lo cifra. Uso: payload de vault_items,
 * name de categorias/tags, backups, etc.
 */
export async function encryptPayload(
  key: CryptoKey,
  payload: unknown,
): Promise<CipherEnvelope> {
  const json = JSON.stringify(payload);
  const bytes = stringToBytes(json);
  return encryptBytes(key, bytes);
}

/**
 * Descifra un envelope y parsea como JSON. El caller es responsable de
 * validar la forma con Zod (los cifrados NO tienen schema — GCM solo
 * valida integridad de bytes, no estructura).
 */
export async function decryptPayload<T = unknown>(
  key: CryptoKey,
  envelope: CipherEnvelope,
): Promise<T> {
  const bytes = await decryptBytes(key, envelope);
  const json = bytesToString(bytes);
  return JSON.parse(json) as T;
}
