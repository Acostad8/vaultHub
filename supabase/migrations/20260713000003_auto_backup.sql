-- =====================================================================
-- 20260713000003_auto_backup
-- Preferencia de auto-backup del usuario. NO es un backup automático real
-- (Zero-Knowledge implica que el server no puede cifrar por el user).
-- El cliente hace polling al abrir el vault: si el intervalo se cumplió
-- desde el último `last_backup_at`, ofrece un download.
--
-- - auto_backup_days: 0 (off) | 1 | 7 | 30. CHECK constraint valida el set.
-- - last_backup_at: se actualiza cuando el user genera un backup exitoso.
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_backup_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_backup_at   TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_auto_backup_days_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_auto_backup_days_check
      CHECK (auto_backup_days IN (0, 1, 7, 30));
  END IF;
END $$;
