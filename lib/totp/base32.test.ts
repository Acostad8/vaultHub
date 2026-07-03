import { describe, it, expect } from "vitest";

import { base32Decode, base32Encode } from "./base32";

describe("base32 RFC 4648", () => {
  // Vectores del RFC 4648 §10:
  const vectors: Array<[string, string]> = [
    ["", ""],
    ["f", "MY"],
    ["fo", "MZXQ"],
    ["foo", "MZXW6"],
    ["foob", "MZXW6YQ"],
    ["fooba", "MZXW6YTB"],
    ["foobar", "MZXW6YTBOI"],
  ];

  it("decode matches RFC vectors", () => {
    for (const [plain, b32] of vectors) {
      const decoded = base32Decode(b32);
      const asString = new TextDecoder().decode(decoded);
      expect(asString).toBe(plain);
    }
  });

  it("encode matches RFC vectors", () => {
    for (const [plain, b32] of vectors) {
      const bytes = new TextEncoder().encode(plain);
      expect(base32Encode(bytes)).toBe(b32);
    }
  });

  it("ignora whitespace y es case-insensitive en decode", () => {
    const a = base32Decode("MZXW 6YTB OI");
    const b = base32Decode("mzxw6ytboi");
    const c = base32Decode("MZXW6YTBOI");
    expect(a).toEqual(c);
    expect(b).toEqual(c);
  });

  it("rechaza caracteres invalidos", () => {
    expect(() => base32Decode("MZ1")).toThrow(); // '1' no esta en el alfabeto base32
    expect(() => base32Decode("MZ0")).toThrow(); // '0' tampoco
    expect(() => base32Decode("MZ!")).toThrow();
  });
});
