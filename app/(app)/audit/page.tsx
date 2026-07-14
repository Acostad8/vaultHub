"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  Download,
  Import,
  KeyRound,
  LogIn,
  LogOut,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  Shield,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCog,
} from "lucide-react";
import type { ComponentType } from "react";

import { errorMessage } from "@/lib/errors";
import { VaultGate } from "@/components/vault/vault-gate";
import {
  EmptyState,
  ErrorBanner,
  LoadingHint,
  ModuleCard,
  ModuleHero,
  ModuleSectionHeader,
  ModuleShell,
} from "@/components/vault/module-shell";
import { listRecentAuditLogs, type AuditAction, type AuditLogRow } from "@/repositories/audit-log";

// Meta por accion: label + icon + color de acento. El color se usa en el dot
// del timeline y el badge del icono para dar lectura rapida del tipo evento.
const ACTION_META: Record<
  AuditAction,
  { label: string; icon: ComponentType<{ className?: string }>; tone: ToneKey }
> = {
  login: { label: "Inicio de sesion", icon: LogIn, tone: "emerald" },
  logout: { label: "Cierre de sesion", icon: LogOut, tone: "zinc" },
  vault_unlock: { label: "Vault desbloqueado", icon: Unlock, tone: "teal" },
  vault_lock: { label: "Vault bloqueado", icon: Lock, tone: "zinc" },
  item_create: { label: "Item creado", icon: Plus, tone: "indigo" },
  item_update: { label: "Item editado", icon: Pencil, tone: "amber" },
  item_delete: { label: "Item borrado", icon: Trash2, tone: "red" },
  item_restore: { label: "Item restaurado", icon: RotateCcw, tone: "lime" },
  item_share: { label: "Item compartido", icon: Share2, tone: "purple" },
  item_unshare: { label: "Item descompartido", icon: Share2, tone: "zinc" },
  export: { label: "Backup exportado", icon: Download, tone: "cyan" },
  import: { label: "Backup importado", icon: Import, tone: "cyan" },
  password_change: { label: "Cambio de password", icon: KeyRound, tone: "rose" },
  device_trust: { label: "Dispositivo confiable", icon: ShieldCheck, tone: "emerald" },
  device_revoke: { label: "Dispositivo revocado", icon: UserCog, tone: "red" },
};

// Grupos de filtro. `actions` es el conjunto de acciones que caen bajo cada
// filtro — mantiene la logica de matching centralizada.
type FilterGroup = "all" | "session" | "vault" | "items" | "backup" | "security";
const FILTER_GROUPS: Array<{ id: FilterGroup; label: string; actions?: Set<AuditAction> }> = [
  { id: "all", label: "todos" },
  { id: "session", label: "sesion", actions: new Set(["login", "logout"]) },
  { id: "vault", label: "vault", actions: new Set(["vault_unlock", "vault_lock"]) },
  {
    id: "items",
    label: "items",
    actions: new Set([
      "item_create",
      "item_update",
      "item_delete",
      "item_restore",
      "item_share",
      "item_unshare",
    ]),
  },
  { id: "backup", label: "backup", actions: new Set(["export", "import"]) },
  {
    id: "security",
    label: "seguridad",
    actions: new Set(["password_change", "device_trust", "device_revoke"]),
  },
];

type ToneKey =
  | "emerald"
  | "teal"
  | "cyan"
  | "indigo"
  | "amber"
  | "red"
  | "lime"
  | "purple"
  | "rose"
  | "zinc";

const TONE_CLASSES: Record<ToneKey, { bg: string; text: string; ring: string; dot: string }> = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
  teal: {
    bg: "bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-400",
    ring: "ring-teal-500/30",
    dot: "bg-teal-500",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-400",
    ring: "ring-cyan-500/30",
    dot: "bg-cyan-500",
  },
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-400",
    ring: "ring-indigo-500/30",
    dot: "bg-indigo-500",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/30",
    dot: "bg-amber-500",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    ring: "ring-red-500/30",
    dot: "bg-red-500",
  },
  lime: {
    bg: "bg-lime-500/10",
    text: "text-lime-700 dark:text-lime-400",
    ring: "ring-lime-500/30",
    dot: "bg-lime-500",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-700 dark:text-purple-400",
    ring: "ring-purple-500/30",
    dot: "bg-purple-500",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
    ring: "ring-rose-500/30",
    dot: "bg-rose-500",
  },
  zinc: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-700 dark:text-zinc-400",
    ring: "ring-zinc-500/30",
    dot: "bg-zinc-400 dark:bg-zinc-600",
  },
};

const DAY_MS = 86_400_000;

// Etiqueta del bucket de dia. Usa "Hoy" / "Ayer" para los mas recientes,
// fecha larga en el resto — mas escaneable que 15 fechas iguales seguidas.
function dayLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / DAY_MS);
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function AuditInner() {
  const [rows, setRows] = useState<AuditLogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterGroup>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    listRecentAuditLogs(200)
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Error"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stats de header — se recalculan cuando llegan los datos. `useMemo` para
  // evitar reescanear en cada render sin cambios reales.
  const stats = useMemo(() => {
    const empty = { total: 0, last24h: 0, logins7d: 0, itemChanges7d: 0, lastEventAt: null as string | null };
    if (!rows) return empty;
    const now = Date.now();
    const H24 = 24 * 3600 * 1000;
    const D7 = 7 * DAY_MS;
    let last24h = 0;
    let logins7d = 0;
    let itemChanges7d = 0;
    const itemActions = new Set<AuditAction>([
      "item_create",
      "item_update",
      "item_delete",
      "item_restore",
    ]);
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      const age = now - t;
      if (age <= H24) last24h += 1;
      if (age <= D7) {
        if (r.action === "login") logins7d += 1;
        if (itemActions.has(r.action)) itemChanges7d += 1;
      }
    }
    return {
      total: rows.length,
      last24h,
      logins7d,
      itemChanges7d,
      lastEventAt: rows[0]?.created_at ?? null,
    };
  }, [rows]);

  // Aplica el filtro activo. `all` deja pasar todo; los otros usan el set
  // definido en FILTER_GROUPS.
  const filtered = useMemo(() => {
    if (!rows) return null;
    if (filter === "all") return rows;
    const group = FILTER_GROUPS.find((g) => g.id === filter);
    if (!group || !group.actions) return rows;
    return rows.filter((r) => group.actions!.has(r.action));
  }, [rows, filter]);

  // Agrupa por dia manteniendo el orden descendente que ya viene del backend.
  const grouped = useMemo(() => {
    if (!filtered) return null;
    const groups: Array<{ key: string; label: string; items: AuditLogRow[] }> = [];
    let currentKey: string | null = null;
    for (const row of filtered) {
      const d = new Date(row.created_at);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString();
      if (key !== currentKey) {
        groups.push({ key, label: dayLabel(new Date(row.created_at)), items: [] });
        currentKey = key;
      }
      groups[groups.length - 1]!.items.push(row);
    }
    return groups;
  }, [filtered]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ModuleShell
      footerNote="bitacora inmutable · solo tu la puedes ver"
      hero={
        <ModuleHero
          eyebrow="vault.audit"
          title="Actividad"
          description="Bitacora inmutable de eventos de tu cuenta. Cada login, unlock, cambio de item, backup y accion de seguridad queda registrado localmente y en tu fila de Supabase (RLS)."
          badge={{ icon: Activity, label: `${stats.total} eventos` }}
        />
      }
    >
      {/* Stats grid — 4 mini cards con metricas rapidas */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Activity className="size-4" />} label="ultimas 24h" value={stats.last24h} tone="emerald" />
        <StatCard icon={<LogIn className="size-4" />} label="logins 7d" value={stats.logins7d} tone="teal" />
        <StatCard icon={<Pencil className="size-4" />} label="cambios 7d" value={stats.itemChanges7d} tone="indigo" />
        <StatCard icon={<Shield className="size-4" />} label="total" value={stats.total} tone="zinc" />
      </div>

      {/* Filtros por categoria de accion */}
      <ModuleCard>
        <ModuleSectionHeader
          title="filtrar"
          hint="Reduce el ruido — solo los eventos que te interesan."
        />
        <div className="flex flex-wrap gap-1.5 p-4">
          {FILTER_GROUPS.map((g) => {
            const active = filter === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setFilter(g.id)}
                className={`rounded-full border px-3 py-1 font-mono text-xs transition-all ${
                  active
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 shadow-sm shadow-emerald-500/20 dark:text-emerald-300"
                    : "border-zinc-300 bg-white text-zinc-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-emerald-500/50 dark:hover:text-emerald-300"
                }`}
                aria-pressed={active}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </ModuleCard>

      {/* Timeline agrupado por dia */}
      <ModuleCard>
        <ModuleSectionHeader
          title="timeline"
          hint="Orden descendente — el evento mas reciente arriba."
          right={
            filtered && filtered.length !== stats.total ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {filtered.length} / {stats.total}
              </span>
            ) : null
          }
        />

        <div className="p-4">
          {error ? <ErrorBanner message={error} /> : null}
          {!rows ? <LoadingHint text="cargando eventos" /> : null}

          {rows && grouped && grouped.length === 0 ? (
            <EmptyState
              icon={<Activity className="size-6" />}
              title="Sin eventos"
              hint="Cambia el filtro o espera nuevas acciones — cada login y cambio deja registro."
            />
          ) : null}

          {grouped && grouped.length > 0 ? (
            <div className="space-y-6">
              {grouped.map((group) => (
                <section key={group.key}>
                  <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                    <span className="inline-block h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      &gt; {group.label}
                    </span>
                    <span className="inline-block h-px w-8 bg-zinc-200 dark:bg-zinc-800" />
                  </h3>
                  <ul className="relative space-y-2 pl-3">
                    {/* Linea vertical del timeline */}
                    <span
                      aria-hidden
                      className="absolute left-[6px] top-1 bottom-1 w-px bg-zinc-200 dark:bg-zinc-800"
                    />
                    {group.items.map((row) => {
                      const meta = ACTION_META[row.action] ?? {
                        label: row.action,
                        icon: Activity,
                        tone: "zinc" as ToneKey,
                      };
                      const Icon = meta.icon;
                      const tone = TONE_CLASSES[meta.tone];
                      const hasMetadata = row.metadata && Object.keys(row.metadata).length > 0;
                      const expanded = expandedIds.has(row.id);
                      return (
                        <li key={row.id} className="relative">
                          {/* Dot del timeline pegado a la linea */}
                          <span
                            aria-hidden
                            className={`absolute -left-[9px] top-4 size-3 rounded-full ring-2 ring-white dark:ring-zinc-900 ${tone.dot}`}
                          />
                          <article className="ml-4 rounded-lg border border-zinc-200 bg-white transition-colors hover:border-emerald-400/50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-emerald-500/40">
                            <div className="flex items-start gap-3 p-3">
                              <div
                                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}
                              >
                                <Icon className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {meta.label}
                                  </p>
                                  <p className="font-mono text-[11px] text-zinc-500">
                                    {formatTime(row.created_at)}
                                  </p>
                                </div>
                                {row.user_agent ? (
                                  <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-400">
                                    {shortUserAgent(row.user_agent)}
                                  </p>
                                ) : null}
                              </div>
                              {hasMetadata ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(row.id)}
                                  aria-expanded={expanded}
                                  aria-label={expanded ? "Ocultar metadata" : "Ver metadata"}
                                  className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                >
                                  <ChevronDown
                                    className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                                  />
                                </button>
                              ) : null}
                            </div>
                            {expanded && hasMetadata ? (
                              <div className="border-t border-zinc-100 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800/60 dark:bg-zinc-900/40">
                                <pre className="overflow-auto font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                                  {JSON.stringify(row.metadata, null, 2)}
                                </pre>
                              </div>
                            ) : null}
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      </ModuleCard>
    </ModuleShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: ToneKey;
}) {
  const c = TONE_CLASSES[tone];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span
          className={`flex size-8 items-center justify-center rounded-lg ${c.bg} ${c.text} ring-1 ${c.ring}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Extrae "Chrome 120 · Windows" o similar del user agent completo — la
// bitacora es mas util con un token de contexto que con la cadena UA cruda.
function shortUserAgent(ua: string): string {
  const m = /(Chrome|Firefox|Safari|Edg|Opera)[/ ](\d+)/.exec(ua);
  const browser = m ? `${m[1] === "Edg" ? "Edge" : m[1]} ${m[2]}` : "browser";
  let os = "";
  if (ua.includes("Windows")) os = "windows";
  else if (ua.includes("Mac OS")) os = "mac";
  else if (ua.includes("Linux")) os = "linux";
  else if (ua.includes("Android")) os = "android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "ios";
  return os ? `${browser.toLowerCase()} · ${os}` : browser.toLowerCase();
}

export default function AuditPage() {
  return (
    <VaultGate>
      <AuditInner />
    </VaultGate>
  );
}
