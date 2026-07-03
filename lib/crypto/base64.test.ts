import { describe, it, expect } from "vitest";

import { base64ToBytes, bytesToBase64, bytesToString, stringToBytes } from "./base64";

describe("base64 helpers", () => {
  it("roundtrip: string -> bytes -> string", () => {
    const original = "hola mundo — cañón — 中文 — 🔒";
    const bytes = stringToBytes(original);
    const back = bytesToString(bytes);
    expect(back).toBe(original);
  });

  it("roundtrip: bytes -> base64 -> bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255, 128, 42]);
    const b64 = bytesToBase64(bytes);
    const back = base64ToBytes(b64);
    expect(back).toEqual(bytes);
  });

  it("base64 is valid ascii (no unicode leakage)", () => {
    const bytes = new Uint8Array(32).fill(0xff);
    const b64 = bytesToBase64(bytes);
    expect(b64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("empty input roundtrip", () => {
    expect(bytesToBase64(new Uint8Array(0))).toBe("");
    expect(base64ToBytes("")).toEqual(new Uint8Array(0));
    expect(stringToBytes("")).toEqual(new Uint8Array(0));
    expect(bytesToString(new Uint8Array(0))).toBe("");
  });

  it("handles payloads larger than the chunk size", () => {
    // 200_000 bytes fuerza multiples iteraciones del chunk interno (0x8000).
    const big = new Uint8Array(200_000);
    for (let i = 0; i < big.length; i++) big[i] = i % 251;
    const b64 = bytesToBase64(big);
    const back = base64ToBytes(b64);
    expect(back).toEqual(big);
  });
});
