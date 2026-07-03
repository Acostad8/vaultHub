import { describe, it, expect } from "vitest";

import { deriveMasterKey } from "./kdf";
import { encryptBytes, decryptBytes } from "./aes";
import { generateSaltBase64 } from "./random";
import { PBKDF2_MIN_ITERATIONS, AES_IV_BYTES } from "./constants";
import { base64ToBytes, stringToBytes, bytesToString, bytesToBase64 } from "./base64";

// Helper local para las suites: deriva una key barata (min iters).
async function makeKey(password = "test-master") {
  return deriveMasterKey({
    password,
    saltBase64: generateSaltBase64(),
    iterations: PBKDF2_MIN_ITERATIONS,
  });
}

describe("AES-GCM encryptBytes/decryptBytes", () => {
  it("roundtrip: plaintext -> encrypt -> decrypt -> plaintext", async () => {
    const key = await makeKey();
    const original = stringToBytes("mensaje confidencial 🔒");
    const envelope = await encryptBytes(key, original);
    const back = await decryptBytes(key, envelope);
    expect(bytesToString(back)).toBe("mensaje confidencial 🔒");
  }, 30_000);

  it("cada encrypt produce IV nuevo (unico por operacion)", async () => {
    const key = await makeKey();
    const bytes = stringToBytes("mismo mensaje");
    const e1 = await encryptBytes(key, bytes);
    const e2 = await encryptBytes(key, bytes);

    expect(e1.iv).not.toBe(e2.iv);
    expect(base64ToBytes(e1.iv).length).toBe(AES_IV_BYTES);
    expect(base64ToBytes(e2.iv).length).toBe(AES_IV_BYTES);

    // Consecuencia deseada: ciphertext tambien varia aunque el plaintext
    // sea igual (GCM sin reuso de IV es semanticamente seguro).
    expect(e1.ciphertext).not.toBe(e2.ciphertext);
  }, 30_000);

  it("100 IVs consecutivos son todos distintos", async () => {
    const key = await makeKey();
    const bytes = stringToBytes("x");
    const ivs = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const e = await encryptBytes(key, bytes);
      ivs.add(e.iv);
    }
    expect(ivs.size).toBe(100);
  }, 60_000);

  it("clave incorrecta falla al descifrar", async () => {
    const good = await makeKey("good");
    const bad = await makeKey("bad");
    const envelope = await encryptBytes(good, stringToBytes("payload"));
    await expect(decryptBytes(bad, envelope)).rejects.toBeInstanceOf(Error);
  }, 30_000);

  it("ciphertext modificado falla (auth tag GCM)", async () => {
    const key = await makeKey();
    const envelope = await encryptBytes(key, stringToBytes("payload"));
    // Flip un bit del ciphertext
    const bytes = base64ToBytes(envelope.ciphertext);
    bytes[0] = bytes[0]! ^ 0x01;
    const tampered = {
      iv: envelope.iv,
      ciphertext: bytesToBase64(bytes),
    };
    await expect(decryptBytes(key, tampered)).rejects.toBeInstanceOf(Error);
  }, 30_000);

  it("IV cambiado falla al descifrar", async () => {
    const key = await makeKey();
    const envelope = await encryptBytes(key, stringToBytes("payload"));
    const ivBytes = base64ToBytes(envelope.iv);
    ivBytes[0] = ivBytes[0]! ^ 0x01;
    const tampered = {
      ciphertext: envelope.ciphertext,
      iv: bytesToBase64(ivBytes),
    };
    await expect(decryptBytes(key, tampered)).rejects.toBeInstanceOf(Error);
  }, 30_000);

  it("payload vacio es soportado (envelope con solo auth tag)", async () => {
    const key = await makeKey();
    const envelope = await encryptBytes(key, new Uint8Array(0));
    const back = await decryptBytes(key, envelope);
    expect(back.length).toBe(0);
  }, 30_000);

  it("payload grande (100 KB) roundtrip", async () => {
    const key = await makeKey();
    const big = new Uint8Array(100 * 1024);
    for (let i = 0; i < big.length; i++) big[i] = i % 256;
    const envelope = await encryptBytes(key, big);
    const back = await decryptBytes(key, envelope);
    expect(back).toEqual(big);
  }, 30_000);
});
