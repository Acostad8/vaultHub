-- =====================================================================
-- 20260708000001_attachments
-- Metadata de archivos adjuntos cifrados (Fase 7). El blob vive en el
-- bucket privado `encrypted-attachments` (migracion 11), cifrado
-- client-side con AES-256-GCM y la master key del usuario.
--
-- Zero-Knowledge: el nombre original del archivo se cifra (puede revelar
-- contenido, ej. "cuenta-banco-galicia.pdf"). El server solo ve
-- ciphertext + IVs + tamano + mime declarado del blob cifrado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.attachments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vault_item_id    UUID NOT NULL REFERENCES public.vault_items(id) ON DELETE CASCADE,

  name_ciphertext  TEXT NOT NULL,   -- filename original cifrado (AES-GCM, base64)
  name_iv          TEXT NOT NULL,   -- IV del nombre, base64
  file_iv          TEXT NOT NULL,   -- IV del blob subido a Storage, base64
  size_bytes       BIGINT NOT NULL CHECK (size_bytes >= 0),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS attachments_item_idx
  ON public.attachments(vault_item_id);
CREATE INDEX IF NOT EXISTS attachments_user_idx
  ON public.attachments(user_id);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Cada policy limita al dueño (auth.uid()): un usuario solo ve/crea/borra
-- metadata de SUS adjuntos. No hay UPDATE — un adjunto es inmutable
-- (se borra y re-sube si cambia).
CREATE POLICY attachments_select_own ON public.attachments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY attachments_insert_own ON public.attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY attachments_delete_own ON public.attachments
  FOR DELETE USING (auth.uid() = user_id);
