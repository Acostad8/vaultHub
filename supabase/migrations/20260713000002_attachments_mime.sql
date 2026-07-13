-- =====================================================================
-- 20260713000002_attachments_mime
-- Añade mime_ciphertext + mime_iv a attachments. El mime original puede
-- revelar el tipo de contenido (ej. "image/jpeg" vs "application/pdf")
-- que en Zero-Knowledge NO debe filtrarse al server. Cifrado igual que
-- name_ciphertext.
--
-- Nullable para no romper filas existentes (creadas antes de esta
-- migración). El cliente muestra un icono genérico cuando faltan.
-- =====================================================================

ALTER TABLE public.attachments
  ADD COLUMN IF NOT EXISTS mime_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS mime_iv         TEXT;

-- Constraint: los dos van juntos o los dos NULL (evita estado inconsistente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attachments_mime_pair_check'
  ) THEN
    ALTER TABLE public.attachments
      ADD CONSTRAINT attachments_mime_pair_check
      CHECK (
        (mime_ciphertext IS NULL AND mime_iv IS NULL)
        OR
        (mime_ciphertext IS NOT NULL AND mime_iv IS NOT NULL)
      );
  END IF;
END $$;
