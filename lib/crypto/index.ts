// Punto de entrada publico del modulo cripto. Todo lo que services y
// hooks necesitan usar debe importarse desde aqui — evita que otros
// modulos toquen internals sensibles como constants o base64.

export {
  PBKDF2_DEFAULT_ITERATIONS,
  PBKDF2_MIN_ITERATIONS,
  AES_KEY_BITS,
  AES_IV_BYTES,
  PBKDF2_SALT_BYTES,
} from "./constants";

export { generateSalt, generateSaltBase64, generateIv, generateRandomBytes } from "./random";

export { bytesToBase64, base64ToBytes } from "./base64";

export { deriveMasterKey } from "./kdf";
export type { DeriveMasterKeyOptions } from "./kdf";

export { encryptBytes, decryptBytes } from "./aes";
export type { CipherEnvelope } from "./aes";

export { encryptPayload, decryptPayload } from "./payload";
export type { SerializablePayload } from "./payload";

export {
  generateSharingKeyPair,
  importSharingPublicKey,
  importSharingPrivateKey,
  generateShareItemKey,
  wrapShareKey,
  unwrapShareKey,
} from "./rsa";
export type { SharingKeyPair } from "./rsa";
