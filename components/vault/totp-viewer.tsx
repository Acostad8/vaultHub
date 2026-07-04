"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateTotpCode, secondsUntilNextTotp } from "@/lib/totp";

interface Props {
  secret: string;
  issuer?: string;
  name: string;
}

// Muestra el codigo TOTP actual + barra de countdown. Recalcula cada 500ms.
export function TotpViewer({ secret, issuer, name }: Props) {
  const [code, setCode] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const c = await generateTotpCode(secret);
        const s = secondsUntilNextTotp();
        if (!cancelled) {
          setCode(c);
          setSecondsLeft(s);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error TOTP");
          setCode("");
        }
      }
    }

    void refresh();
    const id = window.setInterval(() => void refresh(), 500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [secret]);

  async function handleCopy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const pct = (secondsLeft / 30) * 100;
  const nearExpiry = secondsLeft <= 5;

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Codigo TOTP</h3>
          <p className="truncate text-xs text-zinc-500">
            {issuer ? <span className="font-medium">{issuer}</span> : null}
            {issuer && name ? " · " : ""}
            {name}
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="font-mono text-3xl font-semibold tracking-widest tabular-nums">
              {code ? code.match(/.{1,3}/g)?.join(" ") : "— — —"}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!code}
              className="gap-1.5"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full transition-all duration-500 ease-linear ${
                nearExpiry ? "bg-red-500" : "bg-emerald-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Expira en {secondsLeft}s (RFC 6238 SHA-1, 30s, 6 digitos).
          </p>
        </>
      )}
    </Card>
  );
}
