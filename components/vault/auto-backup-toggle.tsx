"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Clock } from "lucide-react";
import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { Label } from "@/components/ui/label";
import {
  fetchMyProfile,
  updateAutoBackupPreference,
  type AutoBackupDays,
} from "@/repositories/profile";

export { backupIsOverdue } from "./backup-schedule";

const OPTIONS: Array<{ value: AutoBackupDays; label: string; hint: string }> = [
  { value: 0, label: "off", hint: "sin recordatorio" },
  { value: 1, label: "diario", hint: "cada 24h" },
  { value: 7, label: "semanal", hint: "cada 7d" },
  { value: 30, label: "mensual", hint: "cada 30d" },
];

// Formatea "hace X" en corto (5m, 2h, 3d). Preciso hasta granularidad util
// para la UI — no necesitamos "hace 5.3 dias".
function relativeShort(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.floor((now - then) / 60000));
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

export function AutoBackupToggle() {
  const [value, setValue] = useState<AutoBackupDays | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMyProfile()
      .then((p) => {
        if (cancelled) return;
        setValue(p.auto_backup_days as AutoBackupDays);
        setLastBackupAt(p.last_backup_at);
      })
      .catch(() => {
        /* silent — la UI muestra el fallback deshabilitado */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleChange(next: AutoBackupDays) {
    setBusy(true);
    const prev = value;
    setValue(next);
    try {
      await updateAutoBackupPreference(next);
      toast.success("Preferencia guardada");
    } catch (err) {
      setValue(prev);
      toast.error(errorMessage(err, "Error guardando"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <CalendarClock className="size-5" />
      </div>
      <div className="flex-1 space-y-3">
        <div>
          <Label className="font-mono text-[11px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
            &gt; frecuencia
          </Label>
          <div
            className="mt-2 flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-label="Frecuencia de backup"
          >
            {OPTIONS.map((o) => {
              const selected = value === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${o.label} — ${o.hint}`}
                  disabled={busy || value === null}
                  onClick={() => handleChange(o.value)}
                  className={`rounded-full border px-3 py-1 font-mono text-xs transition-all ${
                    selected
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 shadow-sm shadow-emerald-500/20 dark:text-emerald-300"
                      : "border-zinc-300 bg-white text-zinc-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-emerald-500/50 dark:hover:text-emerald-300"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
          <Clock className="size-3" />
          {lastBackupAt ? (
            <span>
              ultimo backup <span className="text-emerald-600 dark:text-emerald-400">
                hace {relativeShort(lastBackupAt)}
              </span>{" "}
              · {new Date(lastBackupAt).toLocaleDateString()}
            </span>
          ) : (
            <span>sin backups todavia — exporta el primero abajo</span>
          )}
        </div>
      </div>
    </div>
  );
}
