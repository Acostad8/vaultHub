"use client";

import { useEffect } from "react";

import { useVaultLock } from "@/store/vault-lock";
import { logAudit } from "@/services/audit";

interface AutoLockOptions {
  /** Minutos de inactividad tras los que se limpia la master key. */
  autoLockMinutes: number;
  /**
   * Si true, tambien bloquea al ocultarse la pestaña (visibilitychange).
   * Recomendado true para escenarios sensibles.
   */
  lockOnHidden?: boolean;
}

/**
 * Hook que engancha auto-lock global. Debe montarse una sola vez cerca
 * de la raiz de la app (idealmente en un client component <VaultLockGuard>).
 *
 * - Escucha eventos de actividad del usuario y refresca lastActivity.
 * - Poll cada 15 s revisa timeout de inactividad y llama lock() si vencio.
 * - Opcionalmente bloquea al esconder la pestaña.
 * - Siempre bloquea antes de descargar la pagina (defensa en profundidad).
 */
export function useAutoLock({ autoLockMinutes, lockOnHidden = true }: AutoLockOptions): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { touch, checkTimeout, lock } = useVaultLock.getState();

    // ---- Actividad del usuario ----
    const activityEvents = ["click", "keydown", "mousemove", "touchstart", "scroll"] as const;
    const onActivity = () => touch();
    for (const ev of activityEvents) {
      window.addEventListener(ev, onActivity, { passive: true });
    }

    // ---- Poll de timeout ----
    const pollMs = 15_000;
    const pollId = window.setInterval(() => {
      const wasLocked = checkTimeout(autoLockMinutes);
      if (wasLocked) void logAudit("vault_lock", { reason: "inactivity" });
    }, pollMs);

    // ---- Pestana oculta ----
    const onVisibility = () => {
      if (lockOnHidden && document.visibilityState === "hidden") {
        lock();
        void logAudit("vault_lock", { reason: "tab_hidden" });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ---- beforeunload: limpieza defensiva ----
    const onUnload = () => lock();
    window.addEventListener("beforeunload", onUnload);

    return () => {
      for (const ev of activityEvents) {
        window.removeEventListener(ev, onActivity);
      }
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [autoLockMinutes, lockOnHidden]);
}
