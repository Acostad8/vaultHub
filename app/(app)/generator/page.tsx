"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Copy, RefreshCw, Sparkles } from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/vault/page-header";
import { VaultGate } from "@/components/vault/vault-gate";
import { evaluatePasswordStrength, generatePassword } from "@/lib/password";
import { checkHibp } from "@/lib/password";

const STRENGTH_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
] as const;

interface Options {
  length: number;
  useLowercase: boolean;
  useUppercase: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  excludeAmbiguous: boolean;
  requireEachSet: boolean;
}

const DEFAULTS: Options = {
  length: 20,
  useLowercase: true,
  useUppercase: true,
  useDigits: true,
  useSymbols: true,
  excludeAmbiguous: true,
  requireEachSet: true,
};

function GeneratorInner() {
  const [options, setOptions] = useState<Options>(DEFAULTS);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hibpState, setHibpState] = useState<
    | { state: "idle" }
    | { state: "loading" }
    | { state: "safe" }
    | { state: "breached"; count: number }
    | { state: "error"; message: string }
  >({ state: "idle" });

  function regenerate() {
    try {
      setError(null);
      setHibpState({ state: "idle" });
      setCopied(false);
      setPassword(generatePassword(options));
    } catch (err) {
      setError(errorMessage(err, "Error"));
      setPassword("");
    }
  }

  useEffect(() => {
    // Async wrap para que el React Compiler no marque set-state-in-effect.
    let cancelled = false;
    (async () => {
      try {
        const pwd = generatePassword(options);
        if (!cancelled) {
          setError(null);
          setPassword(pwd);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err, "Error"));
          setPassword("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.length,
    options.useLowercase,
    options.useUppercase,
    options.useDigits,
    options.useSymbols,
    options.excludeAmbiguous,
    options.requireEachSet,
  ]);

  async function handleCopy() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCheckHibp() {
    if (!password) return;
    setHibpState({ state: "loading" });
    try {
      const r = await checkHibp(password);
      if (r.breached) setHibpState({ state: "breached", count: r.count });
      else setHibpState({ state: "safe" });
    } catch (err) {
      setHibpState({ state: "error", message: errorMessage(err, "HIBP no disponible") });
    }
  }

  const strength = password ? evaluatePasswordStrength(password) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        title="Generador de passwords"
        description="Aleatorio criptografico (crypto.getRandomValues + rejection sampling)."
      />

      <Card className="p-5 space-y-5">
        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="font-mono text-lg tracking-wide break-all text-zinc-900 dark:text-zinc-100">
              {password || "—"}
            </div>
          </div>

          {strength ? (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i <= strength.score
                        ? STRENGTH_COLORS[strength.score]
                        : "bg-zinc-200 dark:bg-zinc-800"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                {strength.label.replace("_", " ")} · {strength.entropyBits.toFixed(0)} bits · crack{" "}
                {strength.crackDisplay}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={regenerate} className="gap-1.5">
              <RefreshCw className="size-4" />
              Regenerar
            </Button>
            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={!password}
              className="gap-1.5"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCheckHibp}
              disabled={!password || hibpState.state === "loading"}
              className="gap-1.5"
            >
              <Sparkles className="size-4" />
              {hibpState.state === "loading" ? "Chequeando…" : "Chequear HIBP"}
            </Button>
          </div>

          {hibpState.state === "safe" ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check className="size-4" />
              No aparece en breaches conocidos (HIBP k-anonymity).
            </div>
          ) : null}
          {hibpState.state === "breached" ? (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="size-4" />
              Comprometido: aparece {hibpState.count.toLocaleString()} veces en breaches.
            </div>
          ) : null}
          {hibpState.state === "error" ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertCircle className="size-4" />
              {hibpState.message}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="length">Longitud</Label>
              <span className="text-sm font-medium tabular-nums">{options.length}</span>
            </div>
            <input
              id="length"
              type="range"
              min={6}
              max={64}
              value={options.length}
              onChange={(e) =>
                setOptions((o) => ({ ...o, length: parseInt(e.target.value, 10) }))
              }
              className="w-full accent-zinc-900 dark:accent-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ToggleRow
              label="Minusculas (a-z)"
              checked={options.useLowercase}
              onChange={(v) => setOptions((o) => ({ ...o, useLowercase: v }))}
            />
            <ToggleRow
              label="Mayusculas (A-Z)"
              checked={options.useUppercase}
              onChange={(v) => setOptions((o) => ({ ...o, useUppercase: v }))}
            />
            <ToggleRow
              label="Digitos (0-9)"
              checked={options.useDigits}
              onChange={(v) => setOptions((o) => ({ ...o, useDigits: v }))}
            />
            <ToggleRow
              label="Simbolos"
              checked={options.useSymbols}
              onChange={(v) => setOptions((o) => ({ ...o, useSymbols: v }))}
            />
            <ToggleRow
              label="Excluir ambiguos (0Ol1I…)"
              checked={options.excludeAmbiguous}
              onChange={(v) => setOptions((o) => ({ ...o, excludeAmbiguous: v }))}
            />
            <ToggleRow
              label="Uno de cada set"
              checked={options.requireEachSet}
              onChange={(v) => setOptions((o) => ({ ...o, requireEachSet: v }))}
            />
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white p-2.5 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-zinc-900 dark:accent-zinc-100"
      />
      <span>{label}</span>
    </label>
  );
}

export default function GeneratorPage() {
  return (
    <VaultGate>
      <GeneratorInner />
    </VaultGate>
  );
}
