"use client";

// Banner que aparece en la vista principal del vault cuando el auto-backup
// vencio. Solo aparece cuando auto_backup_days > 0 y el intervalo ya pasó.
// No es intrusivo: es un toast/enlace, y se puede snoozear cerrandolo (in-
// memoria, vuelve a aparecer al siguiente unlock).

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, X } from "lucide-react";

import { fetchMyProfile } from "@/repositories/profile";
import { backupIsOverdue } from "./backup-schedule";

export function BackupReminderBanner() {
  const [overdue, setOverdue] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMyProfile()
      .then((p) => {
        if (cancelled) return;
        setOverdue(backupIsOverdue(p.auto_backup_days, p.last_backup_at));
      })
      .catch(() => {
        // Silent — no molestamos al user si no podemos consultar.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!overdue || dismissed) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <CalendarClock className="size-4 shrink-0" />
      <div className="flex-1">
        <span className="font-medium">Toca hacer backup.</span>{" "}
        <Link href="/backup" className="underline underline-offset-2 hover:opacity-80">
          Exportar ahora
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded p-1 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
        aria-label="Ocultar aviso"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
