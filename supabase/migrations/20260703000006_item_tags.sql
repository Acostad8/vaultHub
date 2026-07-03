-- =====================================================================
-- 20260703000006_item_tags
-- Join table N:N entre vault_items y tags. Sin datos sensibles: relaciona
-- dos IDs de un mismo user. RLS defiende la relacion via el usuario dueño.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.item_tags (
  vault_item_id   UUID NOT NULL REFERENCES public.vault_items(id) ON DELETE CASCADE,
  tag_id          UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  -- user_id redundante pero simplifica RLS (evita JOIN a vault_items en
  -- cada policy) y es coherente con el diseño (un tag y un item pertenecen
  -- al mismo user).
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (vault_item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS item_tags_user_id_idx ON public.item_tags(user_id);
CREATE INDEX IF NOT EXISTS item_tags_tag_id_idx  ON public.item_tags(tag_id);

ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY item_tags_select_own ON public.item_tags
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY item_tags_insert_own ON public.item_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY item_tags_delete_own ON public.item_tags
  FOR DELETE USING (auth.uid() = user_id);
-- No UPDATE: una relacion es inmutable (borrar y recrear si cambia).
