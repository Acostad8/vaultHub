// Store en memoria para la master key. Regla dura de CLAUDE.md:
// la master key NUNCA se persiste (nada de localStorage/IndexedDB/cookies).
// Este store existe solo en el ciclo de vida de la pestaña.
//
// Zustand vanilla sin middleware `persist` — cualquier intento de agregar
// persist aqui es un bug de seguridad.

import { create } from "zustand";

export type VaultStatus =
  | { state: "locked" }
  | { state: "unlocked"; key: CryptoKey; unlockedAt: number; lastActivity: number };

interface VaultLockStore {
  status: VaultStatus;
  /** Marca el vault como desbloqueado con la master key derivada. */
  unlock: (key: CryptoKey) => void;
  /**
   * Limpia la master key de memoria. Se llama en:
   *  - Logout
   *  - Auto-lock por inactividad
   *  - visibilitychange (opcional, configurable)
   *  - beforeunload (limpieza defensiva)
   */
  lock: () => void;
  /** Refresca lastActivity — llamar en eventos de user (click, keypress, etc). */
  touch: () => void;
  /** Devuelve la key si esta unlocked, o lanza si esta locked. */
  requireKey: () => CryptoKey;
  /** Chequea vencimiento de inactividad; si expiro, hace lock automatico. */
  checkTimeout: (autoLockMinutes: number) => boolean;
}

export const useVaultLock = create<VaultLockStore>((set, get) => ({
  status: { state: "locked" },

  unlock(key) {
    const now = Date.now();
    set({ status: { state: "unlocked", key, unlockedAt: now, lastActivity: now } });
  },

  lock() {
    // Al cambiar el estado, el CryptoKey pierde su ultima referencia y
    // queda elegible para GC. Web Crypto keys viven en el heap del
    // navegador; no hay `zeroize` publico, pero al menos JS no puede
    // volver a alcanzarlas.
    set({ status: { state: "locked" } });
  },

  touch() {
    const s = get().status;
    if (s.state === "unlocked") {
      set({ status: { ...s, lastActivity: Date.now() } });
    }
  },

  requireKey() {
    const s = get().status;
    if (s.state !== "unlocked") {
      throw new Error("Vault bloqueado — requerido master password");
    }
    return s.key;
  },

  checkTimeout(autoLockMinutes) {
    const s = get().status;
    if (s.state !== "unlocked") return false;
    const elapsedMs = Date.now() - s.lastActivity;
    const limitMs = autoLockMinutes * 60_000;
    if (elapsedMs >= limitMs) {
      set({ status: { state: "locked" } });
      return true;
    }
    return false;
  },
}));

// Selectores utiles para consumidores:
export const selectIsUnlocked = (s: { status: VaultStatus }) => s.status.state === "unlocked";
export const selectMasterKey = (s: { status: VaultStatus }): CryptoKey | null =>
  s.status.state === "unlocked" ? s.status.key : null;
