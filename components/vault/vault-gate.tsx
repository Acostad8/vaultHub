"use client";

import { errorMessage } from "@/lib/errors";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useProfileCache } from "@/store/profile";
import { useVaultLock } from "@/store/vault-lock";
import { useAutoLock } from "@/hooks/use-auto-lock";

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
    return <p className="p-8 text-sm text-red-600">Error cargando profile: {loadError}</p>;
  }
  if (!profile) {
    return <p className="p-8 text-sm text-zinc-500">Cargando…</p>;
  }
  if (!profile.vault_initialized_at || !isUnlocked) {
    return <p className="p-8 text-sm text-zinc-500">Redirigiendo…</p>;
  }
  return <>{children}</>;
}
