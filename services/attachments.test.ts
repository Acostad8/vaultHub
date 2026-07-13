// Round-trip binario para el cifrado de attachments.
//
// Verifica que un archivo arbitrario (bytes 0x00-0xFF, tamaños varios) se
// cifra y descifra byte-a-byte con la misma master key. No depende de
// Supabase ni del repo — trabaja directo contra las primitivas de crypto,
// que es exactamente el path que attachments.ts usa (encryptBytes /
// decryptBytes + base64 <-> Uint8Array).

import { describe, expect, it } from "vitest";

import { deriveMasterKey } from "@/lib/crypto/kdf";
import { encryptBytes, decryptBytes } from "@/lib/crypto/aes";
import {
  base64ToBytes,
  bytesToBase64,
  bytesToString,
  stringToBytes,
} from "@/lib/crypto/base64";
import { generateSaltBase64 } from "@/lib/crypto/random";
import { PBKDF2_MIN_ITERATIONS } from "@/lib/crypto/constants";

async function newKey(): Promise<CryptoKey> {
  return deriveMasterKey({
    password: "attach-test-master-pwd-9k1x",
    saltBase64: generateSaltBase64(),
    iterations: PBKDF2_MIN_ITERATIONS,
  });
}

function randomBytes(len: number): Uint8Array {
  // Web Crypto limita getRandomValues a 65_536 bytes por llamada.
  const out = new Uint8Array(len);
  const chunk = 65_536;
  for (let off = 0; off < len; off += chunk) {
    const end = Math.min(off + chunk, len);
    crypto.getRandomValues(out.subarray(off, end));
  }
  return out;
}

function allBytesSequence(): Uint8Array {
  const out = new Uint8Array(256);
  for (let i = 0; i < 256; i++) out[i] = i;
  return out;
}

describe("attachments crypto — round trip binario", () => {
  it("payload pequeño (1 KB de bytes aleatorios) cifra/descifra byte-exacto", async () => {
    const key = await newKey();
    const plain = randomBytes(1024);
    const env = await encryptBytes(key, plain);
    const back = await decryptBytes(key, env);
    expect(back.length).toBe(plain.length);
    expect(back).toEqual(plain);
  });

  it("payload con todos los bytes 0x00-0xFF sobrevive base64 y descifrado", async () => {
    const key = await newKey();
    const plain = allBytesSequence();
    const env = await encryptBytes(key, plain);
    // Simula el path repo: encryptedBlob se pasa por base64 en el server response
    // (attachments.ts usa base64ToBytes(env.ciphertext) al subir, y bytesToBase64
    // al descargar). Verificamos que ese roundtrip base64 no corrompe.
    const roundtripped = bytesToBase64(base64ToBytes(env.ciphertext));
    expect(roundtripped).toBe(env.ciphertext);
    const back = await decryptBytes(key, env);
    expect(back).toEqual(plain);
  });

  it("payload de 500 KB (borde inferior de archivos reales) roundtrip OK", async () => {
    const key = await newKey();
    const plain = randomBytes(500 * 1024);
    const env = await encryptBytes(key, plain);
    const back = await decryptBytes(key, env);
    expect(back.byteLength).toBe(plain.byteLength);
    // Comparación por sample (comparar 500KB entero es lento en jsdom; muestreamos
    // primer, medio, últimos bytes + suma-hash).
    expect(back[0]).toBe(plain[0]);
    expect(back[Math.floor(plain.length / 2)]).toBe(plain[Math.floor(plain.length / 2)]);
    expect(back[plain.length - 1]).toBe(plain[plain.length - 1]);
    let sumBack = 0;
    let sumPlain = 0;
    for (let i = 0; i < plain.length; i++) {
      sumBack += back[i]!;
      sumPlain += plain[i]!;
    }
    expect(sumBack).toBe(sumPlain);
  });

  it("archivo vacío (0 bytes) roundtrip OK", async () => {
    const key = await newKey();
    const plain = new Uint8Array(0);
    const env = await encryptBytes(key, plain);
    const back = await decryptBytes(key, env);
    expect(back.length).toBe(0);
  });

  it("mime y filename como bytes utf-8 (nombre 'foto árbol.jpeg')", async () => {
    const key = await newKey();
    const filename = "foto árbol 🌳.jpeg";
    const mime = "image/jpeg";
    const nameEnv = await encryptBytes(key, stringToBytes(filename));
    const mimeEnv = await encryptBytes(key, stringToBytes(mime));
    expect(bytesToString(await decryptBytes(key, nameEnv))).toBe(filename);
    expect(bytesToString(await decryptBytes(key, mimeEnv))).toBe(mime);
  });

  it("clave incorrecta falla al descifrar (auth tag GCM)", async () => {
    const k1 = await newKey();
    const k2 = await newKey(); // salt distinto → key distinta
    const plain = randomBytes(64);
    const env = await encryptBytes(k1, plain);
    await expect(decryptBytes(k2, env)).rejects.toBeDefined();
  });
});
