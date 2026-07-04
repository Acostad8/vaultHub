"use client";

import { errorMessage } from "@/lib/errors";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar password de cuenta</CardTitle>
        <CardDescription>
          Te enviaremos un enlace para restablecer la password de tu cuenta.{" "}
          <strong>Esto NO recupera tu master password</strong> — si la perdiste, tu vault es
          irrecuperable por diseño Zero-Knowledge.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Si el email existe, recibiras un enlace en unos minutos. Revisa tambien spam.
            </p>
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline", className: "w-full" })}
            >
              Volver al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email ? (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              ) : null}
            </div>
            {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Enviando…" : "Enviar enlace"}
            </Button>
            <p className="text-center text-sm">
              <Link
                href="/login"
                className="text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Volver al login
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
