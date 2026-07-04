"use client";

import Link from "next/link";
import { AlertTriangle, Copy, ShieldAlert, ShieldCheck, ShieldX, Star } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { VaultAnalysis } from "@/services/vault-analysis";

interface Props {
  analysis: VaultAnalysis;
}

// Card grande de metrica principal.
function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "neutral" | "warn" | "danger" | "ok";
  hint?: string;
}) {
  const tones: Record<typeof tone, string> = {
    neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    ok: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
        </div>
        <div className={`flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="size-4" />
        </div>
      </div>
    </Card>
  );
}

export function DashboardSummary({ analysis }: Props) {
  const { total, favorites, withPassword, strong, fair, weak, duplicatedItemsCount, weakItems } =
    analysis;

  const strengthTotal = strong + fair + weak;
  const strongPct = strengthTotal ? (strong / strengthTotal) * 100 : 0;
  const fairPct = strengthTotal ? (fair / strengthTotal) * 100 : 0;
  const weakPct = strengthTotal ? (weak / strengthTotal) * 100 : 0;

  const topWeak = weakItems.slice(0, 3);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total items" value={total} icon={ShieldCheck} tone="neutral" />
        <MetricCard label="Favoritos" value={favorites} icon={Star} tone="ok" />
        <MetricCard
          label="Debiles"
          value={weak}
          icon={ShieldAlert}
          tone={weak > 0 ? "warn" : "neutral"}
          hint={withPassword ? `de ${withPassword} con password` : undefined}
        />
        <MetricCard
          label="Duplicados"
          value={duplicatedItemsCount}
          icon={Copy}
          tone={duplicatedItemsCount > 0 ? "danger" : "neutral"}
        />
      </div>

      {strengthTotal > 0 ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Fortaleza global</h3>
              <p className="text-xs text-zinc-500">
                Analisis local de {strengthTotal} passwords en tu vault.
              </p>
            </div>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            {strongPct > 0 ? (
              <div style={{ width: `${strongPct}%` }} className="bg-emerald-500" />
            ) : null}
            {fairPct > 0 ? (
              <div style={{ width: `${fairPct}%` }} className="bg-amber-500" />
            ) : null}
            {weakPct > 0 ? <div style={{ width: `${weakPct}%` }} className="bg-red-500" /> : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              Fuertes {strong}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" />
              Aceptables {fair}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-500" />
              Debiles {weak}
            </span>
          </div>
        </Card>
      ) : null}

      {topWeak.length > 0 ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
              <ShieldX className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Passwords mas debiles</h3>
              <p className="text-xs text-zinc-500">
                Revisa y rota estos primero. Menor entropia arriba.
              </p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {topWeak.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/vault/${w.id}`}
                  className="flex items-center justify-between rounded-md border border-red-100 bg-red-50/50 px-3 py-2 text-sm transition-colors hover:bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 dark:hover:bg-red-950/40"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-red-500" />
                    <span className="truncate font-medium">{w.name}</span>
                  </span>
                  <span className="text-xs text-zinc-500">
                    {w.entropyBits.toFixed(0)} bits
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </section>
  );
}
