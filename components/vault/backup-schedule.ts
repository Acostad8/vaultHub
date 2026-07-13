// Helper puro para el auto-backup. Extraído a su propio archivo para que
// los tests puedan importarlo sin arrastrar el cliente Supabase (que
// requiere env vars en runtime).

export function backupIsOverdue(
  autoBackupDays: number,
  lastBackupAt: string | null,
  nowMs: number = Date.now(),
): boolean {
  if (autoBackupDays === 0) return false;
  if (!lastBackupAt) return true;
  const last = new Date(lastBackupAt).getTime();
  if (!Number.isFinite(last)) return true;
  const dayMs = 24 * 60 * 60 * 1000;
  return nowMs - last >= autoBackupDays * dayMs;
}
