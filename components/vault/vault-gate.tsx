"use client";

import { errorMessage } from "@/lib/errors";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { useProfileCache } from "@/store/profile";
import { useVaultLock } from "@/store/vault-lock";
import { useAutoLock } from "@/hooks/use-auto-lock";
import { heartbeatCurrentDevice } from "@/services/devices";
import { ensureSharingKeys } from "@/services/sharing";
import { signOut } from "@/services/auth";

// Splash full-viewport mientras el gate decide (profile cargando o redirect
// a /unlock / /setup-vault). `fixed inset-0` tapa cualquier shell que el
// caller haya renderizado — evita el flash de layout que expone que hay
// contenido "detras" antes del redirect.
function VaultSplash({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.09),transparent_60%)]"
      />
      <Logo className="size-10 animate-pulse text-emerald-500 dark:text-emerald-400" />
      <p className="font-mono text-xs uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80">
        &gt; {label}
      </p>
    </div>
  );
}

// Gate cliente: decide si mostrar setup, unlock, o el contenido protegido
// segun estado del profile (initialized?) y del store (unlocked?).
export function VaultGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isUnlocked = useVaultLock((s) => s.status.state === "unlocked");
  const profile = useProfileCache((s) => s.profile);
  const loadProfile = useProfileCache((s) => s.load);
  const [loadError, setLoadError] = useState<string | null>(null);

  useAutoLock({ autoLockMinutes: profile?.auto_lock_minutes ?? 5 });

  useEffect(() => {
    if (profile) return;
    loadProfile().catch((err) => setLoadError(errorMessage(err, "Error")));
  }, [profile, loadProfile]);

  // Registro/heartbeat de dispositivo + deteccion de revocacion remota.
  // Si este dispositivo fue revocado desde otra sesion, cerramos sesion local.
  useEffect(() => {
    if (!isUnlocked) return;
    heartbeatCurrentDevice()
      .then(({ revoked }) => {
        if (revoked) {
          void signOut().finally(() => router.replace("/login"));
        }
      })
      .catch(() => {
        // heartbeat es best-effort; sin red no bloquea el vault
      });
    // Par de claves de compartir: se genera la primera vez (idempotente).
    // Necesita la master key (cifra la privada), por eso va post-unlock.
    ensureSharingKeys().catch(() => {
      // best-effort: sin esto solo falla "compartir", no el vault
    });
  }, [isUnlocked, router]);

  useEffect(() => {
    if (!profile) return;
    if (!profile.vault_initialized_at) {
      router.replace("/setup-vault");
      return;
    }
    if (!isUnlocked) {
      router.replace("/unlock");
    }
  }, [profile, isUnlocked, router]);

  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-zinc-50 p-8 text-center dark:bg-zinc-950">
        <AlertTriangle className="size-8 text-red-500" />
        <p className="max-w-md text-sm text-red-600 dark:text-red-400">
          Error cargando profile: {loadError}
        </p>
      </div>
    );
  }
  if (!profile) {
    return <VaultSplash label="verificando vault…" />;
  }
  if (!profile.vault_initialized_at || !isUnlocked) {
    return <VaultSplash label="redirigiendo…" />;
  }
  return <>{children}</>;
}
