import Link from "next/link";
import {
  Activity,
  Archive,
  Folder,
  MonitorSmartphone,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { Logo } from "@/components/ui/logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { VaultGate } from "@/components/vault/vault-gate";
import { VaultList } from "@/components/vault/vault-list";
import { UserBadge } from "@/components/vault/user-badge";
import { BackupReminderBanner } from "@/components/vault/backup-reminder-banner";

// Toolbar agrupada por dominio. Reduce ruido visual vs 10 botones en fila y da
// jerarquia clara: contenido = lo que hay dentro del vault, herramientas =
// utilidades para trabajar con el, cuenta = administracion del propio vault.
const CONTENT_ACTIONS: ToolbarAction[] = [
  { href: "/categories", label: "Categorias", icon: Folder },
  { href: "/tags", label: "Tags", icon: Tag },
  { href: "/shared", label: "Compartidos", icon: Share2 },
];

const TOOL_ACTIONS: ToolbarAction[] = [
  { href: "/generator", label: "Generador", icon: Sparkles },
  { href: "/backup", label: "Backup", icon: Archive },
  { href: "/audit", label: "Actividad", icon: Activity },
];

const ACCOUNT_ACTIONS: ToolbarAction[] = [
  { href: "/security", label: "Seguridad", icon: ShieldCheck },
  { href: "/devices", label: "Dispositivos", icon: MonitorSmartphone },
  { href: "/trash", label: "Papelera", icon: Trash2 },
];

export default function VaultHome() {
  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Blob decorativo emerald (muy sutil) para dar profundidad sin ruido */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.09),transparent_60%)]"
      />

      {/* Header sticky: brand + user + logout */}
      <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link
            href="/vault"
            className="flex items-center gap-2 text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
          >
            <Logo className="size-7" />
            <span className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              vaulthub
              <span className="text-emerald-500">_</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <UserBadge />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main id="main" className="relative mx-auto w-full max-w-6xl px-4 py-10">
        {/* Hero: eyebrow terminal + h1 + subtitulo + estado + CTA principal */}
        <section className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80">
              &gt; vault.home
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              Tu vault
            </h1>
            <p className="max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
              Todo cifrado localmente con{" "}
              <span className="font-mono text-emerald-600 dark:text-emerald-400">AES-256-GCM</span>{" "}
              antes de tocar la red. El servidor solo guarda ciphertext.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />
                zero-knowledge activo
              </span>
            </div>
          </div>
          <div>
            <Link
              href="/vault/new"
              className="group inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/40 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              <Plus className="size-4" />
              Nuevo item
              <span className="text-white/70 transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        </section>

        {/* Toolbar secundaria: 3 grupos etiquetados con pills compactos */}
        <section className="mb-8 rounded-xl border border-zinc-200 bg-white/60 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="grid gap-4 sm:grid-cols-3">
            <ToolbarGroup label="Contenido" actions={CONTENT_ACTIONS} />
            <ToolbarGroup label="Herramientas" actions={TOOL_ACTIONS} />
            <ToolbarGroup label="Cuenta" actions={ACCOUNT_ACTIONS} />
          </div>
        </section>

        <VaultGate>
          <div className="mb-4">
            <BackupReminderBanner />
          </div>
          <VaultList />
        </VaultGate>
      </main>
    </div>
  );
}

interface ToolbarAction {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

// Grupo etiquetado de acciones. Label mono uppercase (guiño terminal) + pills
// icon+label. Hover: acento emerald sutil, coherente con marca.
function ToolbarGroup({ label, actions }: { label: string; actions: ToolbarAction[] }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        &gt; {label.toLowerCase()}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:-translate-y-px hover:border-emerald-400/60 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
          >
            <a.icon className="size-3.5" />
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
