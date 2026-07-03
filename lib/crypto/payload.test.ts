import { describe, it, expect } from "vitest";

import { deriveMasterKey } from "./kdf";
import { generateSaltBase64 } from "./random";
import { PBKDF2_MIN_ITERATIONS } from "./constants";
import { encryptPayload, decryptPayload } from "./payload";

async function makeKey() {
  return deriveMasterKey({
    password: "master",
    saltBase64: generateSaltBase64(),
    iterations: PBKDF2_MIN_ITERATIONS,
  });
}

describe("payload JSON roundtrip", () => {
  it("objeto plano", async () => {
    const key = await makeKey();
    const payload = { name: "GitHub", username: "acostad8", password: "hunter2" };
    const envelope = await encryptPayload(key, payload);
    const back = await decryptPayload<typeof payload>(key, envelope);
    expect(back).toEqual(payload);
  }, 30_000);

  it("array", async () => {
    const key = await makeKey();
    const payload = [1, "two", { three: true }, null];
    const envelope = await encryptPayload(key, payload);
    const back = await decryptPayload(key, envelope);
    expect(back).toEqual(payload);
  }, 30_000);

  it("valores primitivos", async () => {
    const key = await makeKey();
    for (const val of ["string", 42, true, false, null] as const) {
      const env = await encryptPayload(key, val);
      expect(await decryptPayload(key, env)).toBe(val);
    }
  }, 30_000);

  it("estructura anidada con unicode", async () => {
    const key = await makeKey();
    const payload = {
      nombre: "Correo—Personal",
      notas: "cañón, 中文, 🔒",
      campos_custom: [
        { key: "PIN", value: "1234" },
        { key: "código de respaldo", value: "ABCD-EFGH-🌟" },
      ],
    };
    const env = await encryptPayload(key, payload);
    const back = await decryptPayload<typeof payload>(key, env);
    expect(back).toEqual(payload);
  }, 30_000);
});
