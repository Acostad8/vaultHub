"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/google-button";
import { signInWithPassword } from "@/services/auth";
import { isCurrentDeviceTrusted, mfaChallengeRequired } from "@/services/mfa";
import { loginSchema, type LoginInput } from "@/validators/auth";

// Estilo terminal reutilizado en inputs y boton principal para mantener la
// misma paleta de la landing sin depender del tema shadcn.
const TERMINAL_INPUT_CLASS =
  "h-10 border-emerald-500/25 bg-black/40 font-mono text-emerald-100 placeholder:text-emerald-400/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");
  const nextParam = searchParams.get("next");
  const [serverError, setServerError] = useState<string | null>(initialError);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      await signInWithPassword(values);
      const next = nextParam ?? "/vault";
      // 2FA: si la cuenta tiene TOTP y este dispositivo no es confiable,
      // pedir el codigo antes de entrar.
      const { required } = await mfaChallengeRequired();
      if (required && !(await isCurrentDeviceTrusted())) {
        router.push(`/mfa?next=${encodeURIComponent(next)}`);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setServerError(errorMessage(err, "Error al iniciar sesion"));
    }
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1 text-left">
        <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/70">
          &gt; auth.login
        </p>
        <h1 className="font-mono text-2xl leading-tight text-emerald-100 sm:text-3xl">
          Bienvenido de vuelta.
        </h1>
      </header>

      <div className="space-y-4">
        {/* GoogleButton: override de clases via wrapper para pisar el look shadcn. */}
        <div className="[&_button]:h-10 [&_button]:w-full [&_button]:rounded-md [&_button]:border [&_button]:border-emerald-500/30 [&_button]:bg-black/40 [&_button]:font-mono [&_button]:text-sm [&_button]:text-emerald-100 [&_button]:transition-colors hover:[&_button]:border-emerald-400/60 hover:[&_button]:bg-emerald-500/10">
          <GoogleButton disabled={isSubmitting} />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-emerald-500/15" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-black/80 px-3 font-mono text-[10px] uppercase tracking-widest text-emerald-400/70">
              o con email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-mono text-xs uppercase tracking-widest text-emerald-300">
              &gt; email
            </Label>
            <InputWithIcon
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              leftIcon={<Mail className="size-4 text-emerald-400/70" />}
              className={TERMINAL_INPUT_CLASS}
              {...register("email")}
            />
            {errors.email ? (
              <p className="font-mono text-xs text-red-400">! {errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="font-mono text-xs uppercase tracking-widest text-emerald-300"
              >
                &gt; password
              </Label>
              <Link
                href="/forgot-password"
                className="font-mono text-xs text-emerald-400/70 transition-colors hover:text-emerald-200"
              >
                olvide mi password
              </Link>
            </div>
            <InputWithIcon
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="min 10 caracteres"
              leftIcon={<Lock className="size-4 text-emerald-400/70" />}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="rounded p-1 text-emerald-400/70 transition-colors hover:text-emerald-200"
                  aria-label={showPassword ? "Ocultar password" : "Mostrar password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              className={TERMINAL_INPUT_CLASS}
              {...register("password")}
            />
            {errors.password ? (
              <p className="font-mono text-xs text-red-400">! {errors.password.message}</p>
            ) : null}
          </div>

          {serverError ? (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-950/30 p-3 font-mono text-sm text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          ) : null}

          {/* Boton principal estilo terminal, consistente con landing (./init-vault). */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-emerald-400/50 bg-emerald-500/15 px-5 font-mono text-sm text-emerald-100 shadow-[0_0_40px_-10px_rgba(52,211,153,0.55)] transition-all hover:border-emerald-300 hover:bg-emerald-500/25 hover:shadow-[0_0_60px_-10px_rgba(52,211,153,0.85)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-emerald-400">$</span>
            {isSubmitting ? "unlocking…" : "./unlock"}
            {!isSubmitting ? (
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            ) : null}
          </button>
        </form>

        <p className="text-center font-mono text-xs text-emerald-200/70">
          No tienes cuenta?{" "}
          <Link
            href="/register"
            className="text-emerald-300 underline-offset-4 transition-colors hover:text-emerald-200 hover:underline"
          >
            crea tu vault →
          </Link>
        </p>
      </div>
    </div>
  );
}
