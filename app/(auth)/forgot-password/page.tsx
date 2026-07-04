"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Mail } from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/services/auth";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/validators/auth";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    try {
      await requestPasswordReset(values);
      setSent(true);
    } catch (err) {
      setServerError(errorMessage(err, "Error al enviar el email"));
    }
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Enlace enviado</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Si el email existe, recibiras un enlace en unos minutos. Revisa spam.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
        >
          <ArrowLeft className="size-4" />
          Volver al login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Recuperar password</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Enviaremos un enlace para restablecer la password de tu cuenta.
        </p>
      </header>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
        Esto NO recupera tu master password. Si la perdiste, tu vault es irrecuperable por diseño
        Zero-Knowledge.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <InputWithIcon
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            leftIcon={<Mail className="size-4" />}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          ) : null}
        </div>

        {serverError ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting}>
          {isSubmitting ? "Enviando…" : "Enviar enlace"}
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="size-3.5" />
            Volver al login
          </Link>
        </p>
      </form>
    </div>
  );
}
