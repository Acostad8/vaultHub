-- =====================================================================
-- 20260708000003_list_given_shares
-- RPC para que el OWNER liste los shares que emitio con el email del
-- destinatario (profiles esta cerrado por RLS select_own, el join se
-- resuelve aqui). Solo devuelve filas del caller.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.list_given_shares(p_vault_item_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  vault_item_id UUID,
  recipient_email TEXT,
  permission public.share_permission,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.id, s.vault_item_id, p.email, s.permission, s.expires_at, s.created_at
  FROM public.shared_items s
  JOIN public.profiles p ON p.id = s.shared_with_id
  WHERE s.owner_id = auth.uid()
    AND (p_vault_item_id IS NULL OR s.vault_item_id = p_vault_item_id);
$$;

REVOKE ALL ON FUNCTION public.list_given_shares(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_given_shares(UUID) TO authenticated;
