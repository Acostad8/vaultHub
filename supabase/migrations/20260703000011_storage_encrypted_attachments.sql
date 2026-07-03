-- =====================================================================
-- 20260703000011_storage_encrypted_attachments
-- Bucket privado para archivos adjuntos cifrados (Fase 7). Zero-Knowledge:
-- el archivo se cifra client-side con la master key del usuario antes de
-- subirse. El bucket es privado; solo el dueño lee/escribe sus objetos.
--
-- Convencion de path: `{user_id}/{vault_item_id}/{attachment_id}.enc`
-- La primera carpeta del path es SIEMPRE el user_id del dueño — la
-- policy de storage lo verifica.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'encrypted-attachments',
  'encrypted-attachments',
  FALSE,                                            -- privado
  20 * 1024 * 1024,                                 -- 20 MB por archivo
  ARRAY['application/octet-stream']                 -- solo blobs cifrados
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- Policies del bucket. storage.objects ya tiene RLS habilitado por
-- Supabase; solo agregamos policies scoped a este bucket.
--
-- Convencion: split_part(name, '/', 1) es el user_id (primera carpeta).
-- Solo se permiten operaciones cuando ese user_id coincide con auth.uid().
-- ---------------------------------------------------------------------

CREATE POLICY encrypted_attachments_select_own ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'encrypted-attachments'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

CREATE POLICY encrypted_attachments_insert_own ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'encrypted-attachments'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

CREATE POLICY encrypted_attachments_update_own ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'encrypted-attachments'
    AND auth.uid()::text = split_part(name, '/', 1)
  )
  WITH CHECK (
    bucket_id = 'encrypted-attachments'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

CREATE POLICY encrypted_attachments_delete_own ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'encrypted-attachments'
    AND auth.uid()::text = split_part(name, '/', 1)
  );
