"use client";

import { errorMessage } from "@/lib/errors";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMyProfile } from "@/repositories/profile";
import { setupVault } from "@/services/vault";
import { setupVaultSchema, type SetupVaultInput } from "@/validators/vault";
import { evaluatePasswordStrength } from "@/lib/password";

export default function SetupVaultPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyProfile()
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
    return <p className="p-8 text-sm text-zinc-500">Cargando…</p>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Configura tu Master Password</CardTitle>
          <CardDescription>
            Esta password protege tu vault y <strong>no se envia al servidor jamas</strong>. Si la
            olvidas, tu vault es irrecuperable — asi funciona Zero-Knowledge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="masterPassword">Master Password (min 12 chars)</Label>
              <Input
                id="masterPassword"
                type="password"
                autoComplete="new-password"
                {...register("masterPassword")}
              />
              {errors.masterPassword ? (
                <p className="text-sm text-red-600">{errors.masterPassword.message}</p>
              ) : null}
              {strength ? (
                <p className="text-xs text-zinc-500">
                  Fortaleza: <strong>{strength.label}</strong> ({strength.entropyBits.toFixed(0)}{" "}
                  bits, cracking estimado {strength.crackDisplay})
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              ) : null}
            </div>
            <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <input type="checkbox" {...register("acknowledge")} className="mt-0.5" />
              <span>
                Entiendo que <strong>no hay recuperacion</strong> de esta password. Si la pierdo,
                pierdo el vault.
              </span>
            </label>
            {errors.acknowledge ? (
              <p className="text-sm text-red-600">{errors.acknowledge.message as string}</p>
            ) : null}
            {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Configurando…" : "Crear vault"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
