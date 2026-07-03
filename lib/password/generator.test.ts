import { describe, it, expect } from "vitest";

import { generatePassword } from "./generator";
import { AMBIGUOUS, DIGITS, LOWERCASE, SYMBOLS, UPPERCASE } from "./alphabets";

describe("generatePassword", () => {
  it("respeta la longitud", () => {
    for (const len of [8, 16, 32, 64, 128]) {
      expect(generatePassword({ length: len }).length).toBe(len);
    }
  });

  it("con requireEachSet incluye al menos un char de cada set habilitado", () => {
    for (let i = 0; i < 20; i++) {
      const pwd = generatePassword({ length: 12 });
      expect(pwd.split("").some((c) => LOWERCASE.includes(c))).toBe(true);
      expect(pwd.split("").some((c) => UPPERCASE.includes(c))).toBe(true);
      expect(pwd.split("").some((c) => DIGITS.includes(c))).toBe(true);
      expect(pwd.split("").some((c) => SYMBOLS.includes(c))).toBe(true);
    }
  });

  it("excludeAmbiguous filtra 0O1lI5S2Z", () => {
    for (let i = 0; i < 100; i++) {
      const pwd = generatePassword({ length: 32, excludeAmbiguous: true });
      for (const ch of pwd) {
        expect(AMBIGUOUS.includes(ch)).toBe(false);
      }
    }
  });

  it("con solo digits produce solo digitos", () => {
    const pwd = generatePassword({
      length: 20,
      useLowercase: false,
      useUppercase: false,
      useDigits: true,
      useSymbols: false,
      excludeAmbiguous: false,
      requireEachSet: false,
    });
    expect(pwd).toMatch(/^\d{20}$/);
  });

  it("no reutiliza el mismo password en llamadas consecutivas", () => {
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) {
      set.add(generatePassword({ length: 24 }));
    }
    expect(set.size).toBe(50);
  });

  it("rechaza length no valido", () => {
    expect(() => generatePassword({ length: 0 })).toThrow();
    expect(() => generatePassword({ length: -5 })).toThrow();
    expect(() => generatePassword({ length: 1.5 })).toThrow();
  });

  it("rechaza cuando ningun set esta habilitado", () => {
    expect(() =>
      generatePassword({
        length: 10,
        useLowercase: false,
        useUppercase: false,
        useDigits: false,
        useSymbols: false,
      }),
    ).toThrow(/set/);
  });

  it("rechaza length insuficiente cuando requireEachSet=true", () => {
    expect(() => generatePassword({ length: 3, requireEachSet: true })).toThrow(/insuficiente/);
  });

  it("acepta length pequeña si requireEachSet=false", () => {
    const pwd = generatePassword({
      length: 4,
      requireEachSet: false,
      excludeAmbiguous: false,
    });
    expect(pwd.length).toBe(4);
  });
});
