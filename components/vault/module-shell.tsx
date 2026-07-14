import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

// Piezas compartidas por todos los modulos secundarios del vault
// (/categories, /tags, /shared, /devices, etc). Mantienen jerarquia visual
// consistente sin repetir marcado en cada page.

export function ModuleHero({
  eyebrow,
  title,
  description,
  badge,
  backHref = "/vault",
  backLabel = "volver al vault",
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: { icon: ComponentType<{ className?: string }>; label: string };
  backHref?: string;
  backLabel?: string;
}) {
  const BadgeIcon = badge?.icon;
  return (
    <div className="mb-8 space-y-3">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
      >
        <ArrowLeft className="size-3.5" />
        {backLabel}
      </Link>
      <p className="font-mono text-xs uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80">
        &gt; {eyebrow}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          {title}
        </h1>
        {badge && BadgeIcon ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
            <BadgeIcon className="size-3" />
            {badge.label}
          </span>
        ) : null}
      </div>
      <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  );
}

export function ModuleSectionHeader({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-zinc-200 bg-zinc-50/60 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="min-w-0">
        <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-700 dark:text-zinc-200">
          &gt; {title}
        </h2>
        {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

export function ModuleCard({ children }: { children: ReactNode }) {
  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {children}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-200 px-6 py-12 text-center dark:border-zinc-800">
      <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{title}</p>
        {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      </div>
    </div>
  );
}

export function LoadingHint({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 py-6 font-mono text-xs uppercase tracking-widest text-zinc-500">
      <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />
      {text}…
    </p>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-md border border-red-500/25 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function ModuleShell({
  hero,
  children,
  footerNote,
}: {
  hero: ReactNode;
  children: ReactNode;
  footerNote?: string;
}) {
  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.09),transparent_60%)]"
      />
      <div className="relative mx-auto w-full max-w-3xl px-4 py-10">
        {hero}
        {children}
        {footerNote ? (
          <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            &gt; {footerNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
