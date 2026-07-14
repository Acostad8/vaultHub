"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VT323 } from "next/font/google";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, LogOut } from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { MatrixRain } from "@/components/landing/matrix-rain";
import { useProfileCache } from "@/store/profile";
import { signOut } from "@/services/auth";
import { unlockVault } from "@/services/vault";
import { unlockVaultSchema, type UnlockVaultInput } from "@/validators/vault";
import { useVaultLock } from "@/store/vault-lock";

// Font terminal coherente con landing/login.
const vt323 = VT323({
  variable: "--font-terminal",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Estilo terminal reutilizado del bloque auth para consistencia visual.
const TERMINAL_INPUT_CLASS =
  "h-11 border-emerald-500/25 bg-black/40 font-mono text-emerald-100 placeholder:text-emerald-400/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30";

export default function UnlockPage() {
  const router = useRouter();
  const isUnlocked = useVaultLock((s) => s.status.state === "unlocked");
  const lockVault = useVaultLock((s) => s.lock);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      router.replace("/vault");
      return;
    }
    useProfileCache
      .getState()
      .load()
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
      router.push("/vault");
      router.refresh();
    } catch (err) {
      setServerError(errorMessage(err, "Error al desbloquear"));
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    lockVault();
    try {
      await signOut();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div
        className={`${vt323.variable} dark flex min-h-screen items-center justify-center bg-black font-mono text-sm text-emerald-400/70`}
        style={{ ["--font-geist-mono" as string]: "var(--font-terminal)" }}
      >
        <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
        <span className="ml-2">decrypting…</span>
      </div>
    );
  }

  return (
    <div
      className={`${vt323.variable} dark relative min-h-screen bg-black text-emerald-100`}
      style={{ ["--font-geist-mono" as string]: "var(--font-terminal)" }}
    >
      {/* Fondo: matrix rain + vinieta radial para focus en el centro. */}
      <div className="pointer-events-none fixed inset-0">
        <MatrixRain />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.65)_45%,rgba(0,0,0,0.95)_100%)]" />
      </div>

      {/* Header consistente (branding + escape hatch) */}
      <header className="relative z-10 border-b border-emerald-500/15 bg-black/50 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-mono text-emerald-200">
            <Logo className="size-8" />
            <span className="text-2xl font-semibold tracking-tight sm:text-3xl">
              vaulthub<span className="text-emerald-400">_</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-emerald-400/70">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
            locked
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center px-4 py-10">
        <div className="w-full">
          {/* Terminal window: chrome coherente con /login */}
          <div className="overflow-hidden rounded-xl border border-emerald-500/25 bg-black/80 shadow-[0_0_60px_-20px_rgba(52,211,153,0.5)] backdrop-blur-sm">
            {/* Barra superior tipo tty */}
            <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-emerald-300/70">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span className="size-2.5 rounded-full bg-emerald-500/40" />
                <span className="size-2.5 rounded-full bg-emerald-500/25" />
              </div>
              <span>~/vaulthub/vault</span>
              <span className="opacity-60">tty1</span>
            </div>

            <div
              className="relative space-y-7 px-6 py-7 sm:px-8 sm:py-8"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(180deg, transparent 0 2px, rgba(52,211,153,0.03) 2px 3px)",
              }}
            >
              <header className="space-y-3 text-left">
                <p className="font-mono text-xs uppercase tracking-widest text-emerald-400/70">
                  &gt; vault.unlock
                </p>
                <h1 className="font-mono text-3xl text-emerald-100 sm:text-4xl">
                  Desbloquear vault.
                </h1>
                <p className="font-mono text-sm text-emerald-200/70">
                  Introduce tu <span className="text-emerald-300">master password</span> para
                  descifrar el vault. La clave se deriva y se mantiene solo en memoria.
                </p>
              </header>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label
                    htmlFor="masterPassword"
                    className="font-mono text-xs uppercase tracking-widest text-emerald-300"
                  >
                    &gt; master password
                  </Label>
                  <InputWithIcon
                    id="masterPassword"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    autoFocus
                    placeholder="********"
                    leftIcon={<Lock className="size-4 text-emerald-400/70" />}
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="rounded p-1 text-emerald-400/70 transition-colors hover:text-emerald-200"
                        aria-label={showPwd ? "Ocultar" : "Mostrar"}
                      >
                        {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    }
                    className={TERMINAL_INPUT_CLASS}
                    {...register("masterPassword")}
                  />
                  {errors.masterPassword ? (
                    <p className="font-mono text-xs text-red-400">
                      ! {errors.masterPassword.message}
                    </p>
                  ) : null}
                </div>

                {serverError ? (
                  <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-950/30 p-3 font-mono text-sm text-red-300">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-emerald-400/50 bg-emerald-500/15 px-5 font-mono text-sm text-emerald-100 shadow-[0_0_40px_-10px_rgba(52,211,153,0.55)] transition-all hover:border-emerald-300 hover:bg-emerald-500/25 hover:shadow-[0_0_60px_-10px_rgba(52,211,153,0.85)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="text-emerald-400">$</span>
                  {isSubmitting ? "decrypting…" : "./decrypt-vault"}
                </button>
              </form>

              <div className="flex items-center justify-between gap-3 border-t border-emerald-500/15 pt-5 font-mono text-xs">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-emerald-400/70 transition-colors hover:text-emerald-200"
                >
                  <ArrowLeft className="size-4" />
                  volver al inicio
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="inline-flex items-center gap-1.5 text-emerald-400/70 transition-colors hover:text-red-400 disabled:opacity-60"
                >
                  <LogOut className="size-4" />
                  {signingOut ? "cerrando…" : "cerrar sesion"}
                </button>
              </div>
            </div>
          </div>

          {/* Recordatorio zero-knowledge (sutil) */}
          <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-widest text-emerald-500/50">
            &gt; master password nunca sale de tu navegador
          </p>
        </div>
      </main>
    </div>
  );
}
