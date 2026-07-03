import { describe, it, expect, beforeEach } from "vitest";

import { deriveMasterKey } from "@/lib/crypto/kdf";
import { generateSaltBase64 } from "@/lib/crypto/random";
import { PBKDF2_MIN_ITERATIONS } from "@/lib/crypto/constants";
import { useVaultLock } from "./vault-lock";

async function makeKey() {
  return deriveMasterKey({
    password: "test",
    saltBase64: generateSaltBase64(),
    iterations: PBKDF2_MIN_ITERATIONS,
  });
}

describe("vault-lock store", () => {
  beforeEach(() => {
    useVaultLock.getState().lock();
  });

  it("empieza locked", () => {
    expect(useVaultLock.getState().status.state).toBe("locked");
  });

  it("unlock cambia el estado y guarda la key", async () => {
    const key = await makeKey();
    useVaultLock.getState().unlock(key);
    const s = useVaultLock.getState().status;
    expect(s.state).toBe("unlocked");
    if (s.state === "unlocked") {
      expect(s.key).toBe(key);
      expect(s.unlockedAt).toBeGreaterThan(0);
      expect(s.lastActivity).toBe(s.unlockedAt);
    }
  }, 30_000);

  it("lock limpia la key del estado", async () => {
    const key = await makeKey();
    useVaultLock.getState().unlock(key);
    useVaultLock.getState().lock();
    expect(useVaultLock.getState().status.state).toBe("locked");
  }, 30_000);

  it("requireKey lanza cuando esta locked", () => {
    expect(() => useVaultLock.getState().requireKey()).toThrow(/bloqueado/);
  });

  it("requireKey devuelve la key cuando esta unlocked", async () => {
    const key = await makeKey();
    useVaultLock.getState().unlock(key);
    expect(useVaultLock.getState().requireKey()).toBe(key);
  }, 30_000);

  it("touch actualiza lastActivity solo si esta unlocked", async () => {
    // Locked -> touch no rompe.
    useVaultLock.getState().touch();
    expect(useVaultLock.getState().status.state).toBe("locked");

    const key = await makeKey();
    useVaultLock.getState().unlock(key);
    const first = useVaultLock.getState().status;
    if (first.state !== "unlocked") throw new Error("expected unlocked");
    const original = first.lastActivity;
    await new Promise((r) => setTimeout(r, 5));
    useVaultLock.getState().touch();
    const after = useVaultLock.getState().status;
    if (after.state !== "unlocked") throw new Error("expected unlocked");
    expect(after.lastActivity).toBeGreaterThan(original);
  }, 30_000);

  it("checkTimeout locks cuando pasa el limite", async () => {
    const key = await makeKey();
    useVaultLock.getState().unlock(key);

    // Forzar lastActivity al pasado (10 minutos atras)
    useVaultLock.setState((prev) => {
      if (prev.status.state !== "unlocked") return prev;
      return {
        status: { ...prev.status, lastActivity: Date.now() - 10 * 60_000 },
      };
    });

    const timedOut = useVaultLock.getState().checkTimeout(5);
    expect(timedOut).toBe(true);
    expect(useVaultLock.getState().status.state).toBe("locked");
  }, 30_000);

  it("checkTimeout no bloquea si aun hay tiempo", async () => {
    const key = await makeKey();
    useVaultLock.getState().unlock(key);
    const timedOut = useVaultLock.getState().checkTimeout(60);
    expect(timedOut).toBe(false);
    expect(useVaultLock.getState().status.state).toBe("unlocked");
  }, 30_000);
});
