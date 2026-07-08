// Par asimetrico para compartir credenciales (RSA-OAEP 3072 / SHA-256).
//
// Uso: la clave AES efimera de un share se "envuelve" (wrapKey) con la
// PUBLICA del destinatario; solo su PRIVADA puede des-envolverla. La
// privada nunca existe en claro fuera de memoria: se persiste cifrada
// con AES-GCM y la master key del dueño.
//
// RSA-OAEP en vez de ECDH: wrap directo sin acuerdo de claves ni claves
// derivadas por par de usuarios — mas simple de razonar y suficiente
// para el caso (compartir con N destinatarios independientes).

import { encryptBytes, decryptBytes, type CipherEnvelope } from "./aes";
import { base64ToBytes, bytesToBase64 } from "./base64";

const RSA_PARAMS: RsaHashedKeyGenParams = {
  name: "RSA-OAEP",
  modulusLength: 3072,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
  hash: "SHA-256",
};

export interface SharingKeyPair {
  publicKeyJwk: JsonWebKey;
  /** PKCS#8 de la privada, cifrado con la master key (AES-GCM). */
  privateKeyEncrypted: CipherEnvelope;
}

/** Genera el par y deja la privada cifrada con la master key. */
export async function generateSharingKeyPair(masterKey: CryptoKey): Promise<SharingKeyPair> {
  const pair = await crypto.subtle.generateKey(RSA_PARAMS, true, ["wrapKey", "unwrapKey"]);
  const publicKeyJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const privateKeyEncrypted = await encryptBytes(masterKey, pkcs8);
  return { publicKeyJwk, privateKeyEncrypted };
}

export async function importSharingPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, [
    "wrapKey",
  ]);
}

/** Descifra (con la master key) e importa la privada del usuario. */
export async function importSharingPrivateKey(
  masterKey: CryptoKey,
  encrypted: CipherEnvelope,
): Promise<CryptoKey> {
  const pkcs8 = await decryptBytes(masterKey, encrypted);
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8 as BufferSource,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["unwrapKey"],
  );
}

/** Clave AES-256-GCM efimera para cifrar el snapshot de un share. */
export async function generateShareItemKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/** Envuelve la clave del share con la publica del destinatario. Base64. */
export async function wrapShareKey(itemKey: CryptoKey, recipientPublic: CryptoKey): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey("raw", itemKey, recipientPublic, {
    name: "RSA-OAEP",
  });
  return bytesToBase64(new Uint8Array(wrapped));
}

/** Des-envuelve la clave del share con la privada del destinatario. */
export async function unwrapShareKey(
  wrappedBase64: string,
  recipientPrivate: CryptoKey,
): Promise<CryptoKey> {
  const wrapped = base64ToBytes(wrappedBase64);
  return crypto.subtle.unwrapKey(
    "raw",
    wrapped as BufferSource,
    recipientPrivate,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
