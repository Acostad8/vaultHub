-- =====================================================================
-- 20260703000004_tags
-- Tags cifrados igual que categorias. Un item puede tener N tags via
-- item_tags (siguiente migracion).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.tags (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Nombre cifrado (mismo razonamiento que categories).
  name_ciphertext   TEXT NOT NULL,
  name_iv           TEXT NOT NULL,

  color             TEXT CHECK (color IS NULL OR color ~* '^#[0-9a-f]{6}$'),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tags_user_id_idx ON public.tags(user_id);

DROP TRIGGER IF EXISTS tags_set_updated_at ON public.tags;
CREATE TRIGGER tags_set_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select_own ON public.tags
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY tags_insert_own ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY tags_update_own ON public.tags
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY tags_delete_own ON public.tags
  FOR DELETE USING (auth.uid() = user_id);
