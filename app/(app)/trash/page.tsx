"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  Fingerprint,
  FileText,
  Key,
  RotateCcw,
  ShieldAlert,
  Terminal,
  Trash2,
  Undo2,
} from "lucide-react";
import type { ComponentType } from "react";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
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
import { listDecryptedTrash, purgeItem, restoreItem } from "@/services/vault-items";
import type { VaultItemDecrypted, VaultItemType } from "@/types/vault";

const TYPE_META: Record<
  VaultItemType,
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  password: { label: "Password", icon: Key },
  note: { label: "Nota", icon: FileText },
  api_key: { label: "API Key", icon: Terminal },
  ssh_key: { label: "SSH", icon: Terminal },
  card: { label: "Tarjeta", icon: CreditCard },
  identity: { label: "Identidad", icon: Fingerprint },
  totp: { label: "TOTP", icon: ShieldAlert },
};

const DAY_MS = 86_400_000;

function relativeShort(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return "hace segundos";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `hace ${w}sem`;
  const mo = Math.floor(d / 30);
  return `hace ${mo}mes`;
}

function TrashInner() {
  const confirm = useConfirm();
  const [items, setItems] = useState<VaultItemDecrypted[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    listDecryptedTrash()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Error"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    if (!items) return { total: 0, oldestDays: 0, week: 0 };
    let oldest = 0;
    let week = 0;
    const now = Date.now();
    for (const it of items) {
      if (!it.deleted_at) continue;
      const age = now - new Date(it.deleted_at).getTime();
      const days = Math.floor(age / DAY_MS);
      if (days > oldest) oldest = days;
      if (age <= 7 * DAY_MS) week += 1;
    }
    return { total: items.length, oldestDays: oldest, week };
  }, [items]);

  function markBusy(id: string, busy: boolean) {
    setRowBusy((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleRestore(id: string) {
    markBusy(id, true);
    try {
      await restoreItem(id);
      setItems((prev) => prev?.filter((it) => it.id !== id) ?? prev);
      toast.success("Item restaurado");
    } catch (err) {
      toast.error(errorMessage(err, "Error restaurando"));
    } finally {
      markBusy(id, false);
    }
  }

  async function handlePurge(id: string) {
    const ok = await confirm({
      title: "Eliminar permanentemente?",
      description: "Esta accion NO se puede deshacer. El item y su historial se borran.",
      confirmLabel: "Purgar",
      destructive: true,
    });
    if (!ok) return;
    markBusy(id, true);
    try {
      await purgeItem(id);
      setItems((prev) => prev?.filter((it) => it.id !== id) ?? prev);
      toast.success("Item purgado");
    } catch (err) {
      toast.error(errorMessage(err, "Error purgando"));
    } finally {
      markBusy(id, false);
    }
  }

  async function handleRestoreAll() {
    if (!items || items.length === 0) return;
    const ok = await confirm({
      title: `Restaurar ${items.length} items?`,
      description: "Todos los items de la papelera vuelven al vault.",
      confirmLabel: "Restaurar todo",
    });
    if (!ok) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(items.map((it) => restoreItem(it.id)));
    const okCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.length - okCount;
    setItems([]);
    if (failCount > 0) {
      toast.error(`Restaurados ${okCount}/${results.length} — ${failCount} fallaron`);
      // Refresca desde server para reflejar el estado real (parcial).
      listDecryptedTrash()
        .then(setItems)
        .catch(() => {});
    } else {
      toast.success(`${okCount} items restaurados`);
    }
    setBulkBusy(false);
  }

  async function handlePurgeAll() {
    if (!items || items.length === 0) return;
    const ok = await confirm({
      title: `Vaciar papelera (${items.length} items)?`,
      description:
        "Todos los items y su historial se borran permanentemente. Esta accion NO se puede deshacer.",
      confirmLabel: "Vaciar papelera",
      destructive: true,
    });
    if (!ok) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(items.map((it) => purgeItem(it.id)));
    const okCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.length - okCount;
    setItems([]);
    if (failCount > 0) {
      toast.error(`Purgados ${okCount}/${results.length} — ${failCount} fallaron`);
      listDecryptedTrash()
        .then(setItems)
        .catch(() => {});
    } else {
      toast.success(`${okCount} items purgados`);
    }
    setBulkBusy(false);
  }

  return (
    <ModuleShell
      footerNote="items borrados solo se ven aqui — nadie mas puede recuperarlos"
      hero={
        <ModuleHero
          eyebrow="vault.trash"
          title="Papelera"
          description="Items eliminados. Restauralos al vault o purgalos permanentemente. Todo sigue cifrado con tu master key hasta la purga definitiva."
          badge={{ icon: Trash2, label: `${items?.length ?? 0} items` }}
        />
      }
    >
      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="total" value={stats.total} />
        <StatCard label="ultima semana" value={stats.week} />
        <StatCard
          label="mas antiguo"
          value={stats.oldestDays > 0 ? `${stats.oldestDays}d` : "—"}
          highlight={stats.oldestDays > 30}
        />
      </div>

      {/* Bulk actions */}
      {items && items.length > 0 ? (
        <ModuleCard>
          <ModuleSectionHeader
            title="acciones masivas"
            hint="Aplican a todos los items visibles."
          />
          <div className="flex flex-col gap-2 p-4 sm:flex-row">
            <button
              type="button"
              onClick={handleRestoreAll}
              disabled={bulkBusy}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 text-xs font-medium text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300"
            >
              <Undo2 className="size-3.5" />
              {bulkBusy ? "procesando…" : `restaurar todo (${items.length})`}
            </button>
            <button
              type="button"
              onClick={handlePurgeAll}
              disabled={bulkBusy}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-4 text-xs font-medium text-red-700 transition-colors hover:border-red-500 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300"
            >
              <Trash2 className="size-3.5" />
              {bulkBusy ? "procesando…" : `vaciar papelera (${items.length})`}
            </button>
          </div>
        </ModuleCard>
      ) : null}

      {/* Aviso si hay items viejos */}
      {stats.oldestDays > 30 ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <p className="font-semibold">Items antiguos en papelera</p>
            <p className="mt-0.5">
              Tienes items borrados hace mas de 30 dias. Considera purgarlos si ya no los
              necesitas — reducen el tamaño del vault en cada sync.
            </p>
          </div>
        </div>
      ) : null}

      {/* Lista */}
      <ModuleCard>
        <ModuleSectionHeader
          title="items borrados"
          hint="Orden por fecha de borrado — el mas reciente arriba."
          right={
            items && items.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-red-700 dark:text-red-300">
                <Trash2 className="size-3" />
                {items.length}
              </span>
            ) : null
          }
        />
        <div className="p-4">
          {error ? <ErrorBanner message={error} /> : null}
          {!items ? <LoadingHint text="cargando papelera" /> : null}
          {items && items.length === 0 ? (
            <EmptyState
              icon={<Trash2 className="size-6" />}
              title="Papelera vacia"
              hint="Los items que borres desde el vault apareceran aqui hasta que decidas restaurar o purgar."
            />
          ) : null}

          {items && items.length > 0 ? (
            <ul className="space-y-2">
              {items.map((item) => {
                const p = item.payload as { name?: string; username?: string };
                const meta = TYPE_META[item.item_type];
                const Icon = meta.icon;
                const busy = rowBusy.has(item.id);
                return (
                  <li key={item.id}>
                    <article className="group overflow-hidden rounded-lg border border-zinc-200 bg-white transition-all hover:-translate-y-px hover:border-red-400/40 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-red-500/30">
                      <div className="flex items-start gap-3 p-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-700 ring-1 ring-red-500/25 dark:text-red-300">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {meta.label}
                            </span>
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {p.name ?? "(sin nombre)"}
                            </p>
                          </div>
                          {p.username ? (
                            <p className="mt-0.5 truncate text-xs text-zinc-500">{p.username}</p>
                          ) : null}
                          <p
                            className="mt-1 font-mono text-[11px] text-zinc-500"
                            title={
                              item.deleted_at ? new Date(item.deleted_at).toLocaleString() : ""
                            }
                          >
                            borrado{" "}
                            <span className="text-red-600 dark:text-red-400">
                              {relativeShort(item.deleted_at)}
                            </span>
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => handleRestore(item.id)}
                            disabled={busy}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/30 bg-white px-2.5 text-xs font-medium text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                          >
                            <RotateCcw className="size-3.5" />
                            <span className="hidden sm:inline">restaurar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePurge(item.id)}
                            disabled={busy}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/30 bg-white px-2.5 text-xs font-medium text-red-700 transition-colors hover:border-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="hidden sm:inline">purgar</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </ModuleCard>
    </ModuleShell>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 shadow-sm ${
        highlight
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          highlight
            ? "text-amber-700 dark:text-amber-300"
            : "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function TrashPage() {
  return (
    <VaultGate>
      <TrashInner />
    </VaultGate>
  );
}
