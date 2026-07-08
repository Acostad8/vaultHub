"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ShieldCheck } from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mfaChallengeRequired, verifyMfaChallenge } from "@/services/mfa";

function MfaInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") ?? "/";

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    mfaChallengeRequired()
      .then(({ required, factorId }) => {
        if (cancelled) return;
        if (!required) {
          router.replace(nextParam);
          return;
        }
        setFactorId(factorId);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Error verificando 2FA"));
      });
    return () => {
      cancelled = true;
    };
  }, [router, nextParam]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await verifyMfaChallenge(factorId, code);
      router.replace(nextParam);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "Codigo incorrecto"));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Verificacion en dos pasos</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ingresa el codigo de 6 digitos de tu app authenticator.
        </p>
      </header>

      <form onSubmit={handleVerify} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="code">Codigo</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center font-mono text-lg tracking-[0.5em]"
            autoFocus
          />
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={busy || code.length !== 6 || !factorId}
        >
          {busy ? "Verificando…" : "Verificar"}
        </Button>
      </form>
    </div>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
      <MfaInner />
    </Suspense>
  );
}
