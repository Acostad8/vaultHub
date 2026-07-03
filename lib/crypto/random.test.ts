import { describe, it, expect } from "vitest";

import {
  generateIv,
  generateRandomBytes,
  generateSalt,
  generateSaltBase64,
} from "./random";
import { AES_IV_BYTES, PBKDF2_SALT_BYTES } from "./constants";

describe("random", () => {
  it("generateSalt returns exactly PBKDF2_SALT_BYTES bytes", () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(PBKDF2_SALT_BYTES);
  });

  it("generateIv returns exactly AES_IV_BYTES bytes", () => {
    const iv = generateIv();
    expect(iv.length).toBe(AES_IV_BYTES);
  });

  it("generates distinct outputs across calls (no fixed seed)", () => {
    const a = generateIv();
    const b = generateIv();
    // Colision de 12 bytes aleatorios en 2 muestras es ~2^-96 — imposible
    // en la practica. Comparacion byte a byte:
    let equal = true;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        equal = false;
        break;
      }
    }
    expect(equal).toBe(false);
  });

  it("generateSaltBase64 returns decodable base64 of the right length", () => {
    const b64 = generateSaltBase64();
    // 32 bytes -> ceil(32/3)*4 = 44 chars con padding.
    expect(b64.length).toBe(44);
    expect(b64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("generateRandomBytes rejects non-positive lengths", () => {
    expect(() => generateRandomBytes(0)).toThrow();
    expect(() => generateRandomBytes(-1)).toThrow();
    expect(() => generateRandomBytes(1.5)).toThrow();
  });

  it("generateRandomBytes returns exactly N bytes for valid N", () => {
    expect(generateRandomBytes(1).length).toBe(1);
    expect(generateRandomBytes(64).length).toBe(64);
  });
});
