import { describe, it, expect } from "vitest";

import { evaluatePasswordStrength } from "./strength";

describe("evaluatePasswordStrength", () => {
  it("password vacio => very_weak, warning", () => {
    const s = evaluatePasswordStrength("");
    expect(s.score).toBe(0);
    expect(s.label).toBe("very_weak");
    expect(s.warnings.length).toBeGreaterThan(0);
  });

  it("very_weak: password muy corto y trivial", () => {
    const s = evaluatePasswordStrength("abc");
    expect(s.score).toBeLessThanOrEqual(1);
  });

  it("weak: solo digitos", () => {
    const s = evaluatePasswordStrength("12345678");
    expect(s.warnings.some((w) => /digitos/i.test(w))).toBe(true);
    expect(s.score).toBeLessThanOrEqual(1);
  });

  it("fair: 10 chars mixtos", () => {
    const s = evaluatePasswordStrength("Abcdef123!");
    expect(s.score).toBeGreaterThanOrEqual(2);
  });

  it("strong: 16 chars mixtos", () => {
    const s = evaluatePasswordStrength("Abcdef1234!Gh#kL");
    expect(s.score).toBeGreaterThanOrEqual(3);
  });

  it("very_strong: 24 chars random-ish", () => {
    const s = evaluatePasswordStrength("Xk9!mZq2*Lp8@Rt5#Nv7&By3");
    expect(s.score).toBe(4);
    expect(s.label).toBe("very_strong");
    expect(s.entropyBits).toBeGreaterThan(80);
  });

  it("detecta password de un solo caracter repetido", () => {
    const s = evaluatePasswordStrength("aaaaaaaa");
    expect(s.warnings.some((w) => /repetido/i.test(w))).toBe(true);
    expect(s.score).toBe(0);
  });

  it("detecta secuencia comun", () => {
    const s = evaluatePasswordStrength("qwertyabc123");
    expect(s.warnings.some((w) => /secuencia|comun/i.test(w))).toBe(true);
  });

  it("mas caracteres => mas entropia (misma composicion)", () => {
    const short = evaluatePasswordStrength("Aa1!Bb2@");
    const long = evaluatePasswordStrength("Aa1!Bb2@Cc3#Dd4$Ee5%Ff6^");
    expect(long.entropyBits).toBeGreaterThan(short.entropyBits);
  });

  it("crackDisplay tiene formato legible", () => {
    const s = evaluatePasswordStrength("Xk9!mZq2*Lp8@Rt5#Nv7&By3");
    expect(typeof s.crackDisplay).toBe("string");
    expect(s.crackDisplay.length).toBeGreaterThan(0);
  });
});
