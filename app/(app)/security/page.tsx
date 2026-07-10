"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Copy, ShieldCheck, ShieldOff } from "lucide-react";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/vault/page-header";
import { VaultGate } from "@/components/vault/vault-gate";
import {
  enrollTotp,
  listVerifiedTotpFactors,
  unenrollTotp,
  verifyTotpEnrollment,
  type TotpEnrollment,
} from "@/services/mfa";

type Factor = { id: string; friendly_name: string | null; created_at: string };

function SecurityInner() {
  const confirm = useConfirm();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // setState solo dentro de callbacks del Promise (no sincrono en el effect):
  // requisito de react-hooks/set-state-in-effect.
  function reload() {
    return listVerifiedTotpFactors().then(
      (list) => {
        setFactors(list);
        setError(null);
      },
      (err: unknown) => setError(errorMessage(err, "Error cargando factores")),
    );
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleEnroll() {
    setBusy(true);
    setError(null);
    try {
      setEnrollment(await enrollTotp());
    } catch (err) {
      setError(errorMessage(err, "Error iniciando 2FA"));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollment || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await verifyTotpEnrollment(enrollment.factorId, code);
      setEnrollment(null);
      setCode("");
      toast.success("2FA activado");
      void reload();
    } catch (err) {
      setError(errorMessage(err, "Codigo incorrecto — intenta de nuevo"));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnenroll(factorId: string) {
    const ok = await confirm({
      title: "Desactivar 2FA?",
      description:
        "Tu cuenta quedara protegida solo por password. El vault sigue requiriendo la master password.",
      confirmLabel: "Desactivar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await unenrollTotp(factorId);
      toast.success("2FA desactivado");
      void reload();
    } catch (err) {
      setError(errorMessage(err, "Error desactivando"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopySecret() {
    if (!enrollment) return;
    await navigator.clipboard.writeText(enrollment.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const hasFactor = (factors?.length ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        title="Seguridad de cuenta"
        description="Segunda capa para el login. El vault siempre requiere ademas tu master password."
      />

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <div
            className={`flex size-9 items-center justify-center rounded-lg text-white shadow-lg ${
              hasFactor
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
                : "bg-gradient-to-br from-zinc-400 to-zinc-500 shadow-zinc-500/25"
            }`}
          >
            {hasFactor ? <ShieldCheck className="size-5" /> : <ShieldOff className="size-5" />}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Autenticacion en dos pasos (TOTP)</h3>
            <p className="text-xs text-zinc-500">
              {factors === null
                ? "Cargando…"
                : hasFactor
                  ? "Activa. Se pide un codigo al iniciar sesion en dispositivos no confiables."
                  : "Inactiva. Agrega una app authenticator (Aegis, Google Authenticator, etc.)."}
            </p>
          </div>
          {factors !== null && !hasFactor && !enrollment ? (
            <Button onClick={handleEnroll} disabled={busy} className="shrink-0">
              Activar 2FA
            </Button>
          ) : null}
        </div>

        {enrollment ? (
          <div className="mt-5 space-y-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <div className="shrink-0 rounded-lg bg-white p-2 ring-1 ring-zinc-200">
                {/* qr_code de Supabase llega como SVG/data-URL */}
                {enrollment.qrCode.startsWith("data:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={enrollment.qrCode} alt="QR para app authenticator" width={160} height={160} />
                ) : (
                  <div
                    className="size-40 [&_svg]:size-full"
                    dangerouslySetInnerHTML={{ __html: enrollment.qrCode }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm">
                  1. Escanea el QR con tu app authenticator, o ingresa el secreto manual:
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-zinc-100 px-2 py-1 font-mono text-xs dark:bg-zinc-800">
                    {enrollment.secret}
                  </code>
                  <Button type="button" size="xs" variant="outline" onClick={handleCopySecret}>
                    <Copy className="size-3.5" />
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="text-sm">2. Ingresa el codigo de 6 digitos para confirmar:</p>
                <form onSubmit={handleVerify} className="flex items-center gap-2">
                  <Label htmlFor="totp-code" className="sr-only">
                    Codigo TOTP
                  </Label>
                  <Input
                    id="totp-code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="w-32 text-center font-mono tracking-widest"
                    autoFocus
                  />
                  <Button type="submit" disabled={busy || code.length !== 6}>
                    {busy ? "Verificando…" : "Confirmar"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        ) : null}

        {hasFactor ? (
          <ul className="mt-5 space-y-2 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            {factors?.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1 truncate">
                  {f.friendly_name ?? "TOTP"}{" "}
                  <span className="text-xs text-zinc-500">
                    — desde {new Date(f.created_at).toLocaleDateString()}
                  </span>
                </span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleUnenroll(f.id)}
                  disabled={busy}
                >
                  Desactivar
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <p className="mt-4 text-xs text-zinc-500">
        Nota: los dispositivos marcados como confiables en{" "}
        <a href="/devices" className="underline underline-offset-2">
          Dispositivos
        </a>{" "}
        omiten el codigo 2FA durante 30 dias. Zero-Knowledge: incluso con la sesion abierta,
        el vault requiere tu master password.
      </p>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <VaultGate>
      <SecurityInner />
    </VaultGate>
  );
}
