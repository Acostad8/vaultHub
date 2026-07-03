-- =====================================================================
-- 20260703000003_categories
-- Categorias/carpetas del vault. name_ciphertext + iv porque el nombre
-- de la categoria puede revelar informacion (ej. "Trabajo", "Banco X",
-- "Cripto") — se trata como sensible.
-- color e icon son metadata no sensible (personalizacion UI).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Nombre cifrado con la master key del usuario. Base64 del ciphertext
  -- AES-GCM. Nunca en claro.
  name_ciphertext   TEXT NOT NULL,
  -- IV unico por operacion de cifrado (12 bytes AES-GCM, base64).
  name_iv           TEXT NOT NULL,

  -- Icono y color: metadata no sensible (nombres de icon lucide + hex).
  icon              TEXT,
  color             TEXT CHECK (color IS NULL OR color ~* '^#[0-9a-f]{6}$'),

  -- Orden en la UI. Metadata no sensible.
  sort_order        INTEGER NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS categories_user_id_idx
  ON public.categories(user_id);

CREATE INDEX IF NOT EXISTS categories_user_id_sort_order_idx
  ON public.categories(user_id, sort_order);

DROP TRIGGER IF EXISTS categories_set_updated_at ON public.categories;
CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- SELECT: solo el dueño ve sus categorias.
CREATE POLICY categories_select_own ON public.categories
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: user_id debe coincidir con auth.uid() — evita que un usuario
-- cree categorias para otro.
CREATE POLICY categories_insert_own ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: dueño puede editar sus propias categorias, sin poder mover una
-- categoria a otro user_id (WITH CHECK).
CREATE POLICY categories_update_own ON public.categories
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: dueño puede borrar. La cascada en vault_items.category_id se
-- resuelve con ON DELETE SET NULL (ver migracion vault_items).
CREATE POLICY categories_delete_own ON public.categories
  FOR DELETE USING (auth.uid() = user_id);
