"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, ShieldAlert } from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { useProfileCache } from "@/store/profile";
import { setupVault } from "@/services/vault";
import { setupVaultSchema, type SetupVaultInput } from "@/validators/vault";
import { evaluatePasswordStrength } from "@/lib/password";

const STRENGTH_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
] as const;

export default function SetupVaultPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    useProfileCache
      .getState()
      .load()
      .then((p) => {
        if (p.vault_initialized_at) router.replace("/unlock");
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SetupVaultInput>({
    resolver: zodResolver(setupVaultSchema),
    defaultValues: { masterPassword: "", confirmPassword: "", acknowledge: undefined },
  });

  const masterPassword = watch("masterPassword");
  const strength = masterPassword ? evaluatePasswordStrength(masterPassword) : null;

  async function onSubmit(values: SetupVaultInput) {
    setServerError(null);
    try {
      await setupVault(values.masterPassword);
      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(errorMessage(err, "Error configurando el vault"));
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
    <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-12">
      <div className="w-full space-y-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
            <KeyRound className="size-6" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Configura tu Master Password</h1>
          <p className="mx-auto max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            Protege tu vault localmente. No se envia al servidor jamas.
          </p>
        </header>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong className="font-semibold">Zero-Knowledge:</strong> si la olvidas, tu vault es
              irrecuperable. No hay reset ni recuperacion por email.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="masterPassword">Master Password (min 12 chars)</Label>
            <InputWithIcon
              id="masterPassword"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
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
            {strength ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i <= strength.score
                          ? STRENGTH_COLORS[strength.score]
                          : "bg-zinc-200 dark:bg-zinc-800"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-500">
                  {strength.label.replace("_", " ")} · {strength.entropyBits.toFixed(0)} bits · crack{" "}
                  {strength.crackDisplay}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar</Label>
            <InputWithIcon
              id="confirmPassword"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              leftIcon={<Lock className="size-4" />}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-200 bg-white p-3 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
            <input
              type="checkbox"
              {...register("acknowledge")}
              className="mt-0.5 accent-zinc-900 dark:accent-zinc-100"
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              Entiendo que <strong>no hay recuperacion</strong> de esta password. Si la pierdo,
              pierdo el vault.
            </span>
          </label>
          {errors.acknowledge ? (
            <p className="text-xs text-red-600">{errors.acknowledge.message as string}</p>
          ) : null}

          {serverError ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Configurando…" : "Crear vault"}
          </Button>
        </form>
      </div>
    </div>
  );
}
