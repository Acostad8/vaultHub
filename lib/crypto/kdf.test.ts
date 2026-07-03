import { describe, it, expect } from "vitest";

import { deriveMasterKey } from "./kdf";
import { generateSaltBase64 } from "./random";
import { PBKDF2_DEFAULT_ITERATIONS, PBKDF2_MIN_ITERATIONS } from "./constants";
import { encryptPayload, decryptPayload } from "./payload";

// Los tests de KDF con 600k iters son lentos por diseno (esa es la
// proteccion). Se usan las MIN iters directamente para que la CI no
// tarde eternamente, pero se verifica que el rechazo por debajo del
// minimo si funciona.

describe("deriveMasterKey", () => {
  it("misma password + salt + iters -> claves equivalentes (encrypt/decrypt cross)", async () => {
    const salt = generateSaltBase64();
    const key1 = await deriveMasterKey({
      password: "correct horse battery staple",
      saltBase64: salt,
      iterations: PBKDF2_MIN_ITERATIONS,
    });
    const key2 = await deriveMasterKey({
      password: "correct horse battery staple",
      saltBase64: salt,
      iterations: PBKDF2_MIN_ITERATIONS,
    });

    // Web Crypto no permite comparar CryptoKey por identidad. Se valida
    // via encrypt con una, decrypt con la otra.
    const envelope = await encryptPayload(key1, { secret: "42" });
    const roundtrip = await decryptPayload<{ secret: string }>(key2, envelope);
    expect(roundtrip.secret).toBe("42");
  }, 30_000);

  it("password distinta -> clave distinta (decrypt cruzado falla)", async () => {
    const salt = generateSaltBase64();
    const good = await deriveMasterKey({
      password: "correct horse battery staple",
      saltBase64: salt,
      iterations: PBKDF2_MIN_ITERATIONS,
    });
    const bad = await deriveMasterKey({
      password: "correct horse battery stapleX",
      saltBase64: salt,
      iterations: PBKDF2_MIN_ITERATIONS,
    });
    const envelope = await encryptPayload(good, "top-secret");
    await expect(decryptPayload(bad, envelope)).rejects.toBeInstanceOf(Error);
  }, 30_000);

  it("salt distinto -> clave distinta (decrypt cruzado falla)", async () => {
    const password = "correct horse battery staple";
    const key1 = await deriveMasterKey({
      password,
      saltBase64: generateSaltBase64(),
      iterations: PBKDF2_MIN_ITERATIONS,
    });
    const key2 = await deriveMasterKey({
      password,
      saltBase64: generateSaltBase64(),
      iterations: PBKDF2_MIN_ITERATIONS,
    });
    const envelope = await encryptPayload(key1, "value");
    await expect(decryptPayload(key2, envelope)).rejects.toBeInstanceOf(Error);
  }, 30_000);

  it("rechaza password vacia", async () => {
    await expect(
      deriveMasterKey({
        password: "",
        saltBase64: generateSaltBase64(),
        iterations: PBKDF2_MIN_ITERATIONS,
      }),
    ).rejects.toThrow("Master password vacia");
  });

  it("rechaza iteraciones por debajo del minimo OWASP", async () => {
    await expect(
      deriveMasterKey({
        password: "x",
        saltBase64: generateSaltBase64(),
        iterations: PBKDF2_MIN_ITERATIONS - 1,
      }),
    ).rejects.toThrow(/Iteraciones insuficientes/);
    await expect(
      deriveMasterKey({
        password: "x",
        saltBase64: generateSaltBase64(),
        iterations: 100_000,
      }),
    ).rejects.toThrow(/Iteraciones insuficientes/);
  });

  it("acepta el default de 600_000 iteraciones", async () => {
    await expect(
      deriveMasterKey({
        password: "correct horse battery staple",
        saltBase64: generateSaltBase64(),
        iterations: PBKDF2_DEFAULT_ITERATIONS,
      }),
    ).resolves.toBeDefined();
  }, 30_000);

  it("clave por default es no-extractable", async () => {
    const key = await deriveMasterKey({
      password: "x",
      saltBase64: generateSaltBase64(),
      iterations: PBKDF2_MIN_ITERATIONS,
    });
    expect(key.extractable).toBe(false);
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
  }, 30_000);
});
