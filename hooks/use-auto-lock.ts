"use client";

import { useEffect } from "react";

import { useVaultLock } from "@/store/vault-lock";
import { logAudit } from "@/services/audit";

interface AutoLockOptions {
  /** Minutos de inactividad tras los que se limpia la master key. */
  autoLockMinutes: number;
  /**
   * Si true, bloquea tras que la pestaña esta oculta por
   * `hiddenGraceSeconds` seguidos. Recomendado true para escenarios sensibles.
   */
  lockOnHidden?: boolean;
  /**
   * Segundos de tolerancia al ocultarse la pestaña antes de bloquear.
   * Si el usuario vuelve antes de que expire, se cancela el bloqueo.
   * Regla CLAUDE.md dice "cambio de pestaña prolongado" — no instantaneo.
   */
  hiddenGraceSeconds?: number;
}

/**
 * Hook que engancha auto-lock global. Debe montarse una sola vez cerca
 * de la raiz de la app (idealmente en un client component <VaultLockGuard>).
 *
 * - Escucha eventos de actividad del usuario y refresca lastActivity.
 * - Poll cada 15 s revisa timeout de inactividad y llama lock() si vencio.
 * - Opcionalmente bloquea al esconder la pestaña (con grace period).
 * - Siempre bloquea antes de descargar la pagina (defensa en profundidad).
 */
export function useAutoLock({
  autoLockMinutes,
  lockOnHidden = true,
  hiddenGraceSeconds = 30,
}: AutoLockOptions): void {
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

    // ---- Pestana oculta (con grace period) ----
    let hiddenTimerId: number | null = null;
    const clearHiddenTimer = () => {
      if (hiddenTimerId !== null) {
        window.clearTimeout(hiddenTimerId);
        hiddenTimerId = null;
      }
    };
    const onVisibility = () => {
      if (!lockOnHidden) return;
      if (document.visibilityState === "hidden") {
        clearHiddenTimer();
        hiddenTimerId = window.setTimeout(() => {
          hiddenTimerId = null;
          if (document.visibilityState === "hidden") {
            lock();
            void logAudit("vault_lock", { reason: "tab_hidden" });
          }
        }, hiddenGraceSeconds * 1_000);
      } else {
        // Volvio antes de expirar -> cancelar bloqueo.
        clearHiddenTimer();
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
      clearHiddenTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [autoLockMinutes, lockOnHidden, hiddenGraceSeconds]);
}
