"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldAlert } from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/google-button";
import { signUpWithPassword } from "@/services/auth";
import { registerSchema, type RegisterInput } from "@/validators/auth";

// Estilo terminal reutilizado en inputs (misma paleta que /login).
const TERMINAL_INPUT_CLASS =
  "h-10 border-emerald-500/25 bg-black/40 font-mono text-emerald-100 placeholder:text-emerald-400/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    try {
      const { needsEmailConfirmation } = await signUpWithPassword(values);
      if (needsEmailConfirmation) {
        router.push(`/check-email?email=${encodeURIComponent(values.email)}`);
      } else {
        router.push("/vault");
        router.refresh();
      }
    } catch (err) {
      setServerError(errorMessage(err, "Error al registrarse"));
    }
  }

  return (
    <div className="space-y-7">
      <header className="space-y-3 text-left">
        <p className="font-mono text-xs uppercase tracking-widest text-emerald-400/70">
          &gt; auth.register
        </p>
        <h1 className="font-mono text-3xl text-emerald-100 sm:text-4xl">Crea tu vault.</h1>
        <p className="font-mono text-sm text-emerald-200/70">
          Esta es tu password de <span className="text-emerald-300">cuenta</span>. La master
          password que protege tu vault se define despues — y no se puede recuperar.
        </p>
      </header>

      <div className="space-y-6">
        {/* GoogleButton: override de clases via wrapper para pisar el look shadcn. */}
        <div className="[&_button]:h-11 [&_button]:w-full [&_button]:rounded-md [&_button]:border [&_button]:border-emerald-500/30 [&_button]:bg-black/40 [&_button]:font-mono [&_button]:text-sm [&_button]:text-emerald-100 [&_button]:transition-colors hover:[&_button]:border-emerald-400/60 hover:[&_button]:bg-emerald-500/10">
          <GoogleButton disabled={isSubmitting} />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-emerald-500/15" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-black/70 px-3 font-mono text-xs uppercase tracking-widest text-emerald-400/70">
              o con email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="font-mono text-xs uppercase tracking-widest text-emerald-300"
            >
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

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="font-mono text-xs uppercase tracking-widest text-emerald-300"
            >
              &gt; password{" "}
              <span className="text-emerald-400/50 normal-case tracking-normal">
                (min 10 chars)
              </span>
            </Label>
            <InputWithIcon
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="********"
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

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="font-mono text-xs uppercase tracking-widest text-emerald-300"
            >
              &gt; confirm password
            </Label>
            <InputWithIcon
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="********"
              leftIcon={<Lock className="size-4 text-emerald-400/70" />}
              className={TERMINAL_INPUT_CLASS}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="font-mono text-xs text-red-400">
                ! {errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          {/* Aviso zero-knowledge: subraya que perder la master pass = vault perdido. */}
          <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-950/20 p-3 font-mono text-xs text-amber-200/80">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <span>
              Al crear el vault definiras una <span className="text-amber-200">master password</span>{" "}
              distinta. Si la olvidas, el vault sera irrecuperable — es el precio del
              zero-knowledge.
            </span>
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
            className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-emerald-400/50 bg-emerald-500/15 px-5 font-mono text-sm text-emerald-100 shadow-[0_0_40px_-10px_rgba(52,211,153,0.55)] transition-all hover:border-emerald-300 hover:bg-emerald-500/25 hover:shadow-[0_0_60px_-10px_rgba(52,211,153,0.85)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-emerald-400">$</span>
            {isSubmitting ? "initializing…" : "./init-vault"}
            {!isSubmitting ? (
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            ) : null}
          </button>
        </form>

        <p className="text-center font-mono text-sm text-emerald-200/70">
          Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-emerald-300 underline-offset-4 transition-colors hover:text-emerald-200 hover:underline"
          >
            entra a tu vault →
          </Link>
        </p>
      </div>
    </div>
  );
}
