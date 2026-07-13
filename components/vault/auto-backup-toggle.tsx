"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  fetchMyProfile,
  updateAutoBackupPreference,
  type AutoBackupDays,
} from "@/repositories/profile";

export { backupIsOverdue } from "./backup-schedule";

const OPTIONS: Array<{ value: AutoBackupDays; label: string }> = [
  { value: 0, label: "Off" },
  { value: 1, label: "Diario" },
  { value: 7, label: "Semanal" },
  { value: 30, label: "Mensual" },
];

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
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          <CalendarClock className="size-4" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium">Recordatorio de backup</p>
            <p className="text-xs text-zinc-500">
              Zero-Knowledge no permite backup automático real (el server no tiene tu master key).
              Cuando el intervalo se cumpla, VaultHub te lo recuerda al abrir el vault.
            </p>
          </div>
          <div>
            <Label className="text-xs">Frecuencia</Label>
            <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Frecuencia de backup">
              {OPTIONS.map((o) => {
                const selected = value === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={busy || value === null}
                    onClick={() => handleChange(o.value)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selected
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-zinc-300 bg-transparent text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
          {lastBackupAt ? (
            <p className="text-[11px] text-zinc-500">
              Ultimo backup: {new Date(lastBackupAt).toLocaleString()}
            </p>
          ) : (
            <p className="text-[11px] text-zinc-500">Sin backups todavia.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

