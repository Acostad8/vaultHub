"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ScanLine,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
import { Label } from "@/components/ui/label";
import { VaultGate } from "@/components/vault/vault-gate";
import {
  ErrorBanner,
  ModuleCard,
  ModuleHero,
  ModuleSectionHeader,
  ModuleShell,
} from "@/components/vault/module-shell";
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
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

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
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(errorMessage(err, "Error iniciando 2FA"));
    } finally {
      setBusy(false);
    }
  }

  function handleDigit(idx: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = clean;
      return next;
    });
    if (clean && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;
    e.preventDefault();
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] ?? "");
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (!enrollment || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await verifyTotpEnrollment(enrollment.factorId, code);
      setEnrollment(null);
      setDigits(["", "", "", "", "", ""]);
      toast.success("2FA activado");
      void reload();
    } catch (err) {
      setError(errorMessage(err, "Codigo incorrecto — intenta de nuevo"));
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
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
  const codeComplete = digits.every((d) => d.length === 1);

  return (
    <ModuleShell
      footerNote="2FA solo cubre el login · el vault siempre requiere master password"
      hero={
        <ModuleHero
          eyebrow="vault.security"
          title="Seguridad de cuenta"
          description="Segunda capa criptografica sobre el login de Supabase Auth. TOTP compatible con Google Authenticator, Aegis, 1Password, Bitwarden y cualquier app RFC 6238."
          badge={{
            icon: hasFactor ? ShieldCheck : ShieldOff,
            label: hasFactor ? "2FA activo" : "sin 2FA",
          }}
        />
      }
    >
      {error ? (
        <div className="mb-6">
          <ErrorBanner message={error} />
        </div>
      ) : null}

      {/* Status card grande */}
      <ModuleCard>
        <ModuleSectionHeader
          title="autenticacion en dos pasos"
          hint="Se pide un codigo de 6 digitos al iniciar sesion en dispositivos no confiables."
          right={
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                hasFactor
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              <span
                className={`inline-block size-1.5 animate-pulse rounded-full ${
                  hasFactor ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
              {hasFactor ? "operational" : "disabled"}
            </span>
          }
        />

        <div className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div
              className={`flex size-14 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${
                hasFactor
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30"
                  : "bg-gradient-to-br from-zinc-400 to-zinc-600 shadow-zinc-500/30"
              }`}
            >
              {hasFactor ? (
                <ShieldCheck className="size-7" />
              ) : (
                <ShieldOff className="size-7" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {factors === null
                  ? "Cargando…"
                  : hasFactor
                    ? "Segunda capa activa"
                    : "Sin segunda capa"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                {factors === null
                  ? "leyendo factores…"
                  : hasFactor
                    ? "Un atacante con tu password aun necesita el codigo TOTP para entrar."
                    : "Solo password de cuenta protege el login. Agrega TOTP para proteccion real."}
              </p>
            </div>
            {factors !== null && !hasFactor && !enrollment ? (
              <button
                type="button"
                onClick={handleEnroll}
                disabled={busy}
                className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              >
                <ShieldCheck className="size-4" />
                activar 2FA
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : null}
          </div>

          {/* Enrollment wizard */}
          {enrollment ? (
            <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                {/* QR code + secret */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                    <ScanLine className="size-3.5" />
                    &gt; escanea el qr
                  </div>
                  <div className="mx-auto shrink-0 rounded-xl border-2 border-emerald-500/25 bg-white p-3 shadow-lg shadow-emerald-500/10 md:mx-0">
                    {enrollment.qrCode.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={enrollment.qrCode}
                        alt="QR para app authenticator"
                        width={180}
                        height={180}
                      />
                    ) : (
                      <div
                        className="size-44 [&_svg]:size-full"
                        dangerouslySetInnerHTML={{ __html: enrollment.qrCode }}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Manual entry */}
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                      <KeyRound className="size-3.5" />
                      &gt; o ingresa manualmente
                    </p>
                    <div className="flex items-center gap-2 rounded-md border border-emerald-500/25 bg-black/5 px-3 py-2 dark:bg-black/40">
                      <code className="min-w-0 flex-1 truncate font-mono text-xs text-emerald-700 dark:text-emerald-300">
                        {showSecret
                          ? enrollment.secret
                          : "•".repeat(Math.min(24, enrollment.secret.length))}
                      </code>
                      <button
                        type="button"
                        onClick={() => setShowSecret((v) => !v)}
                        className="rounded p-1 text-zinc-500 transition-colors hover:text-emerald-700 dark:hover:text-emerald-300"
                        aria-label={showSecret ? "Ocultar" : "Mostrar"}
                      >
                        {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="rounded p-1 text-zinc-500 transition-colors hover:text-emerald-700 dark:hover:text-emerald-300"
                        aria-label="Copiar"
                      >
                        {copied ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Verification code — 6 boxes pin style */}
                  <form onSubmit={handleVerify} className="space-y-3">
                    <Label className="font-mono text-[11px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                      &gt; codigo de 6 digitos
                    </Label>
                    <div className="flex gap-1.5 sm:gap-2">
                      {digits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            inputRefs.current[i] = el;
                          }}
                          inputMode="numeric"
                          autoComplete={i === 0 ? "one-time-code" : "off"}
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleDigit(i, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(i, e)}
                          onPaste={handlePaste}
                          className="h-12 w-full rounded-lg border-2 border-emerald-500/30 bg-white text-center font-mono text-xl font-semibold text-zinc-900 shadow-sm outline-none transition-all focus:border-emerald-500 focus:shadow-md focus:shadow-emerald-500/30 dark:border-emerald-500/40 dark:bg-zinc-900 dark:text-zinc-100"
                          aria-label={`Digito ${i + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={busy || !codeComplete}
                      className="group inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-medium text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                    >
                      <Check className="size-4" />
                      {busy ? "verificando…" : "confirmar y activar"}
                      {!busy ? (
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      ) : null}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : null}

          {/* Factor list */}
          {hasFactor ? (
            <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                &gt; factores activos
              </p>
              <ul className="space-y-2">
                {factors?.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      <Smartphone className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {f.friendly_name ?? "TOTP factor"}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                        activo desde {new Date(f.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnenroll(f.id)}
                      disabled={busy}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/30 bg-white px-2.5 text-xs font-medium text-red-700 transition-colors hover:border-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      <ShieldOff className="size-3.5" />
                      desactivar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </ModuleCard>

      {/* Info cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          icon={<Smartphone className="size-4" />}
          title="Dispositivos confiables"
          body="Los dispositivos que marcas como confiables desde Devices omiten el codigo TOTP durante 30 dias."
          linkHref="/devices"
          linkLabel="ir a dispositivos"
        />
        <InfoCard
          icon={<Lock className="size-4" />}
          title="Master password"
          body="Incluso con la sesion abierta, el vault sigue cifrado con tu master. TOTP protege el LOGIN, no el vault."
        />
      </div>
    </ModuleShell>
  );
}

function InfoCard({
  icon,
  title,
  body,
  linkHref,
  linkLabel,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h4>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{body}</p>
          {linkHref && linkLabel ? (
            <Link
              href={linkHref}
              className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              {linkLabel}
              <ArrowRight className="size-3" />
            </Link>
          ) : null}
        </div>
      </div>
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
