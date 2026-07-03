-- =====================================================================
-- 20260703000005_vault_items
-- Tabla principal. Cada fila = un item del vault (password, nota, API
-- key, etc). Todos los datos sensibles viajan como un blob JSON cifrado
-- en `payload_ciphertext` + `payload_iv` — server jamas ve nombre,
-- usuario, URL ni notas en claro.
--
-- Decision de diseño clave (documentar en CRYPTO_FLOW.md):
--   Se cifra un unico blob JSON por item (incluyendo name, url, username,
--   password, notes, custom_fields). No campos cifrados individuales.
--   Ventajas: atomicidad, un solo IV por operacion, menor superficie de
--   metadata. Desventaja: busqueda por nombre/URL requiere descifrar y
--   filtrar client-side (aceptable para vaults tipicos de 100-1000 items).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.vault_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Tipo del item. Metadata no sensible (server necesita esto para
  -- filtros del sidebar y estadisticas del dashboard).
  item_type             public.vault_item_type NOT NULL,

  -- Categoria (opcional). SET NULL si la categoria se borra — no queremos
  -- perder el item por eso.
  category_id           UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  -- Payload cifrado. JSON serializado antes de cifrar. Ver
  -- docs/CRYPTO_FLOW.md para el shape por tipo.
  payload_ciphertext    TEXT NOT NULL,
  payload_iv            TEXT NOT NULL,

  -- Metadata NO sensible que el server puede indexar para queries baratas:
  is_favorite           BOOLEAN NOT NULL DEFAULT FALSE,

  -- Soft delete. Papelera = items con deleted_at NOT NULL. Restaurar =
  -- set NULL. Purga permanente = DELETE fisico.
  deleted_at            TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Indices: uno compuesto por los filtros mas comunes de UI, otro para
-- listar la papelera. NO se indexa el ciphertext (imposible y no util).
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS vault_items_user_active_idx
  ON public.vault_items(user_id, item_type, is_favorite, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS vault_items_user_trash_idx
  ON public.vault_items(user_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS vault_items_user_category_idx
  ON public.vault_items(user_id, category_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS vault_items_set_updated_at ON public.vault_items;
CREATE TRIGGER vault_items_set_updated_at
  BEFORE UPDATE ON public.vault_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;

-- SELECT: dueño ve sus items. La visibilidad de items compartidos se
-- maneja con una policy separada en shared_items (migracion 8).
CREATE POLICY vault_items_select_own ON public.vault_items
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: solo con user_id propio.
CREATE POLICY vault_items_insert_own ON public.vault_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: solo dueño; no puede transferirse a otro user_id.
CREATE POLICY vault_items_update_own ON public.vault_items
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: solo dueño (para purga permanente desde papelera).
CREATE POLICY vault_items_delete_own ON public.vault_items
  FOR DELETE USING (auth.uid() = user_id);
