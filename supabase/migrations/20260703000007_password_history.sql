-- =====================================================================
-- 20260703000007_password_history
-- Historial de versiones anteriores de un vault_item. Guardado cifrado
-- igual que el item (mismo esquema payload_ciphertext/iv). Cada cambio
-- inserta una fila con el payload anterior antes de sobreescribirlo.
-- La rotacion (cuantas versiones mantener por item) se hace en la capa
-- de servicio, no aqui, para poder ajustarla sin migracion.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.password_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id         UUID NOT NULL REFERENCES public.vault_items(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Payload cifrado del estado anterior. Mismo formato que vault_items.
  payload_ciphertext    TEXT NOT NULL,
  payload_iv            TEXT NOT NULL,

  -- Timestamp del cambio (cuando se archivó, o sea cuando se sobrescribió
  -- la version actual).
  archived_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_history_item_idx
  ON public.password_history(vault_item_id, archived_at DESC);

CREATE INDEX IF NOT EXISTS password_history_user_idx
  ON public.password_history(user_id);

ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY password_history_select_own ON public.password_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY password_history_insert_own ON public.password_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Sin UPDATE (historial es inmutable por definicion).
-- DELETE permitido para el dueño (rotacion, limpieza manual).
CREATE POLICY password_history_delete_own ON public.password_history
  FOR DELETE USING (auth.uid() = user_id);
