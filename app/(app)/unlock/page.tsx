"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchMyProfile } from "@/repositories/profile";
import { unlockVault } from "@/services/vault";
import { unlockVaultSchema, type UnlockVaultInput } from "@/validators/vault";
import { useVaultLock } from "@/store/vault-lock";

export default function UnlockPage() {
  const router = useRouter();
  const isUnlocked = useVaultLock((s) => s.status.state === "unlocked");
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      setServerError(err instanceof Error ? err.message : "Error al desbloquear");
    }
  }

  if (loading) return <p className="p-8 text-sm text-zinc-500">Cargando…</p>;

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Desbloquear vault</CardTitle>
          <CardDescription>
            Ingresa tu Master Password para acceder a tus credenciales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="masterPassword">Master Password</Label>
              <Input
                id="masterPassword"
                type="password"
                autoComplete="current-password"
                autoFocus
                {...register("masterPassword")}
              />
              {errors.masterPassword ? (
                <p className="text-sm text-red-600">{errors.masterPassword.message}</p>
              ) : null}
            </div>
            {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Desbloqueando…" : "Desbloquear"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
