-- =====================================================================
-- 20260703000008_shared_items
-- Compartir un vault_item con otro usuario del sistema.
--
-- Modelo cripto para compartir en Zero-Knowledge:
--   El item esta cifrado con la master key del OWNER. Para compartirlo,
--   el owner deriva/exporta la clave simetrica del item y la re-cifra con
--   la CLAVE PUBLICA del destinatario (par de claves asimetricas por
--   usuario, tema pendiente de disenar en Fase 7). Mientras tanto se
--   deja `encrypted_key_ciphertext` como TEXT NULLable, con el marker
--   TODO para completar cuando se implemente el par asimetrico.
--
-- NOTA: si el par de claves publico/privado por usuario no se aborda,
-- compartir de forma zero-knowledge NO es posible. Esta migracion crea
-- la estructura, pero la funcionalidad debe activarse solo cuando el
-- flujo asimetrico este implementado (documentado en DECISIONS_NEEDED
-- si se llega a Fase 7 sin resolverlo).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.shared_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id             UUID NOT NULL REFERENCES public.vault_items(id) ON DELETE CASCADE,
  owner_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Clave simetrica del item, re-cifrada con la clave publica del
  -- destinatario. Ver nota arriba: pendiente hasta implementar par
  -- asimetrico por usuario.
  encrypted_key_ciphertext  TEXT,
  encrypted_key_iv          TEXT,

  permission                public.share_permission NOT NULL DEFAULT 'read',

  expires_at                TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un mismo item no se comparte dos veces al mismo destinatario.
  CONSTRAINT shared_items_unique_pair UNIQUE (vault_item_id, shared_with_id),
  -- Un item no se comparte consigo mismo.
  CONSTRAINT shared_items_no_self_share CHECK (owner_id <> shared_with_id)
);

CREATE INDEX IF NOT EXISTS shared_items_owner_idx
  ON public.shared_items(owner_id);
CREATE INDEX IF NOT EXISTS shared_items_shared_with_idx
  ON public.shared_items(shared_with_id);
CREATE INDEX IF NOT EXISTS shared_items_active_idx
  ON public.shared_items(shared_with_id, expires_at)
  WHERE expires_at IS NULL OR expires_at > NOW();

DROP TRIGGER IF EXISTS shared_items_set_updated_at ON public.shared_items;
CREATE TRIGGER shared_items_set_updated_at
  BEFORE UPDATE ON public.shared_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;

-- SELECT: dueño ve sus shares emitidos; destinatario ve los que recibio.
CREATE POLICY shared_items_select_owner ON public.shared_items
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY shared_items_select_recipient ON public.shared_items
  FOR SELECT USING (auth.uid() = shared_with_id);

-- INSERT: solo el dueño del item puede compartirlo (y con owner_id = auth.uid()).
CREATE POLICY shared_items_insert_owner ON public.shared_items
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- UPDATE: solo el dueño puede cambiar permiso / expiracion. El destinatario
-- no puede modificar el share (si quiere "aceptar/rechazar", eso es UI, no DB).
CREATE POLICY shared_items_update_owner ON public.shared_items
  FOR UPDATE USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- DELETE: el dueño revoca, o el destinatario "elimina de mi vista".
CREATE POLICY shared_items_delete_owner ON public.shared_items
  FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY shared_items_delete_recipient ON public.shared_items
  FOR DELETE USING (auth.uid() = shared_with_id);

-- ---------------------------------------------------------------------
-- Policy extra en vault_items: permitir a un destinatario LEER el item
-- compartido (solo SELECT, no update/delete — esos siguen restringidos
-- al dueño). El destinatario tampoco puede leer si el share expiro.
-- ---------------------------------------------------------------------
CREATE POLICY vault_items_select_shared ON public.vault_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shared_items s
      WHERE s.vault_item_id = vault_items.id
        AND s.shared_with_id = auth.uid()
        AND (s.expires_at IS NULL OR s.expires_at > NOW())
    )
  );
