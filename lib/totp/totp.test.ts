import { describe, it, expect } from "vitest";

import { generateTotpCode, verifyTotpCode, secondsUntilNextTotp } from "./totp";
import { base32Encode } from "./base32";

// RFC 6238 Appendix B: secret ASCII "12345678901234567890" (20 bytes).
const RFC_SECRET_ASCII = "12345678901234567890";
const RFC_SECRET_B32 = base32Encode(new TextEncoder().encode(RFC_SECRET_ASCII));

const RFC_VECTORS_SHA1: Array<[number, string]> = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
];

describe("generateTotpCode (RFC 6238 SHA-1 8 digits)", () => {
  for (const [t, expected] of RFC_VECTORS_SHA1) {
    it(`T=${t} produce ${expected}`, async () => {
      const code = await generateTotpCode(RFC_SECRET_B32, {
        digits: 8,
        algorithm: "SHA-1",
        period: 30,
        now: () => t,
      });
      expect(code).toBe(expected);
    });
  }

  it("default = 6 digits SHA-1 30s period, con now fijo", async () => {
    const code = await generateTotpCode(RFC_SECRET_B32, { now: () => 59 });
    // Los ultimos 6 digitos del vector de RFC (94287082 -> 287082)
    expect(code).toBe("287082");
    expect(code.length).toBe(6);
  });

  it("rechaza secret vacio", async () => {
    await expect(generateTotpCode("")).rejects.toThrow(/vacio/);
  });

  it("codigo cambia entre ventanas", async () => {
    const a = await generateTotpCode(RFC_SECRET_B32, { now: () => 59 });
    const b = await generateTotpCode(RFC_SECRET_B32, { now: () => 89 });
    expect(a).not.toBe(b);
  });
});

describe("secondsUntilNextTotp", () => {
  it("devuelve segundos restantes en la ventana de 30s", () => {
    expect(secondsUntilNextTotp({ now: () => 0 })).toBe(30);
    expect(secondsUntilNextTotp({ now: () => 29 })).toBe(1);
    expect(secondsUntilNextTotp({ now: () => 30 })).toBe(30);
    expect(secondsUntilNextTotp({ now: () => 45 })).toBe(15);
  });
});

describe("verifyTotpCode con window de tolerancia", () => {
  it("acepta el codigo actual", async () => {
    const now = () => 1_700_000_000;
    const code = await generateTotpCode(RFC_SECRET_B32, { now });
    expect(await verifyTotpCode(RFC_SECRET_B32, code, { now })).toBe(true);
  });

  it("acepta la ventana anterior si window >= 1", async () => {
    const now = () => 1_700_000_000;
    const codePrev = await generateTotpCode(RFC_SECRET_B32, { now: () => 1_700_000_000 - 30 });
    expect(await verifyTotpCode(RFC_SECRET_B32, codePrev, { now, window: 1 })).toBe(true);
  });

  it("rechaza codigos muy viejos aunque window sea 1", async () => {
    const now = () => 1_700_000_000;
    const codeOld = await generateTotpCode(RFC_SECRET_B32, { now: () => 1_700_000_000 - 300 });
    expect(await verifyTotpCode(RFC_SECRET_B32, codeOld, { now, window: 1 })).toBe(false);
  });

  it("rechaza input no numerico", async () => {
    expect(await verifyTotpCode(RFC_SECRET_B32, "abc123")).toBe(false);
    expect(await verifyTotpCode(RFC_SECRET_B32, "")).toBe(false);
  });
});
