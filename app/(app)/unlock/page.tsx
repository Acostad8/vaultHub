"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { fetchMyProfile } from "@/repositories/profile";
import { unlockVault } from "@/services/vault";
import { unlockVaultSchema, type UnlockVaultInput } from "@/validators/vault";
import { useVaultLock } from "@/store/vault-lock";

export default function UnlockPage() {
  const router = useRouter();
  const isUnlocked = useVaultLock((s) => s.status.state === "unlocked");
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      router.replace("/");
      return;
    }
    fetchMyProfile()
      .then((p) => {
        if (!p.vault_initialized_at) router.replace("/setup-vault");
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isUnlocked, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UnlockVaultInput>({
    resolver: zodResolver(unlockVaultSchema),
    defaultValues: { masterPassword: "" },
  });

  async function onSubmit(values: UnlockVaultInput) {
    setServerError(null);
    try {
      await unlockVault(values.masterPassword);
      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(errorMessage(err, "Error al desbloquear"));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        Cargando…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
      <div className="w-full space-y-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
            <ShieldCheck className="size-6" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Desbloquear vault</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Ingresa tu Master Password para continuar.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="masterPassword">Master Password</Label>
            <InputWithIcon
              id="masterPassword"
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              autoFocus
              leftIcon={<Lock className="size-4" />}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label={showPwd ? "Ocultar" : "Mostrar"}
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              {...register("masterPassword")}
            />
            {errors.masterPassword ? (
              <p className="text-xs text-red-600">{errors.masterPassword.message}</p>
            ) : null}
          </div>

          {serverError ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Desbloqueando…" : "Desbloquear"}
          </Button>
        </form>
      </div>
    </div>
  );
}
