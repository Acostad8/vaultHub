"use client";

import { useEffect, useState } from "react";
import {
  Activity,
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
  ShieldCheck,
  Trash2,
  Unlock,
  UserCog,
} from "lucide-react";
import type { ComponentType } from "react";

import { errorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/card";
import { VaultGate } from "@/components/vault/vault-gate";
import { PageHeader } from "@/components/vault/page-header";
import { listRecentAuditLogs, type AuditAction, type AuditLogRow } from "@/repositories/audit-log";

const ACTION_META: Record<
  AuditAction,
  { label: string; icon: ComponentType<{ className?: string }>; accent: string }
> = {
  login: { label: "Inicio de sesion", icon: LogIn, accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  logout: { label: "Cierre de sesion", icon: LogOut, accent: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
  vault_unlock: { label: "Vault desbloqueado", icon: Unlock, accent: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  vault_lock: { label: "Vault bloqueado", icon: Lock, accent: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
  item_create: { label: "Item creado", icon: Plus, accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  item_update: { label: "Item editado", icon: Pencil, accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  item_delete: { label: "Item borrado", icon: Trash2, accent: "bg-red-500/10 text-red-600 dark:text-red-400" },
  item_restore: { label: "Item restaurado", icon: RotateCcw, accent: "bg-lime-500/10 text-lime-600 dark:text-lime-400" },
  item_share: { label: "Item compartido", icon: Share2, accent: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  item_unshare: { label: "Item descompartido", icon: Share2, accent: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
  export: { label: "Backup exportado", icon: Download, accent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  import: { label: "Backup importado", icon: Import, accent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  password_change: { label: "Cambio de password", icon: KeyRound, accent: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  device_trust: { label: "Dispositivo confiable", icon: ShieldCheck, accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  device_revoke: { label: "Dispositivo revocado", icon: UserCog, accent: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

function AuditInner() {
  const [rows, setRows] = useState<AuditLogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <PageHeader
        title="Actividad"
        description="Bitacora inmutable de eventos de tu cuenta (ultimos 200)."
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!rows ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
      {rows && rows.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
            <Activity className="size-5" />
          </div>
          <p className="mt-4 text-sm font-medium">Sin eventos aun</p>
          <p className="mt-1 text-xs text-zinc-500">Cada login, unlock y cambio deja registro.</p>
        </Card>
      ) : null}

      <ul className="space-y-2">
        {rows?.map((row) => {
          const meta = ACTION_META[row.action] ?? {
            label: row.action,
            icon: Activity,
            accent: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
          };
          const Icon = meta.icon;
          return (
            <li key={row.id}>
              <Card className="p-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.accent}`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>
                  {row.metadata && Object.keys(row.metadata).length > 0 ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                        Metadata
                      </summary>
                      <pre className="mt-1 max-w-md overflow-auto rounded-md bg-zinc-50 p-2 text-[10px] dark:bg-zinc-900">
                        {JSON.stringify(row.metadata, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AuditPage() {
  return (
    <VaultGate>
      <AuditInner />
    </VaultGate>
  );
}
