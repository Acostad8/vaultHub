// Helpers puros de codificacion. No tocan crypto.subtle ni hacen IO.
// La DB guarda ciphertext, IV y salt como base64 (texto seguro para JSON,
// URLs y columnas TEXT). Web Crypto API opera con ArrayBuffer/Uint8Array.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function stringToBytes(value: string): Uint8Array {
  return encoder.encode(value);
}

export function bytesToString(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

export function bytesToBase64(bytes: Uint8Array): string {
  // btoa en runtime web/node acepta binary strings (chars 0-255).
  // Se construye la binary string en chunks para evitar stack overflows
  // en payloads grandes (String.fromCharCode con spread revienta arriba de
  // ~100k args).
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
