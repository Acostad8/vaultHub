-- =====================================================================
-- 20260703000014_password_history_trigger
-- Snapshot automático del payload cifrado anterior al actualizar un
-- vault_item. La fila vieja se copia a password_history antes de aplicar
-- el UPDATE. Trigger SECURITY DEFINER porque el INSERT en password_history
-- debe pasar aunque la policy de RLS del cliente niegue (auth.uid() es NULL
-- en un trigger). El SET search_path bloquea search_path injection.
--
-- Solo se crea un snapshot cuando payload_ciphertext cambia — evitar
-- ruido cuando el update fue solo de is_favorite, category_id, etc.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.snapshot_vault_item_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.payload_ciphertext IS DISTINCT FROM OLD.payload_ciphertext THEN
    INSERT INTO public.password_history (
      vault_item_id,
      user_id,
      payload_ciphertext,
      payload_iv,
      archived_at
    ) VALUES (
      OLD.id,
      OLD.user_id,
      OLD.payload_ciphertext,
      OLD.payload_iv,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.snapshot_vault_item_history() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_vault_item_history() FROM anon;
REVOKE EXECUTE ON FUNCTION public.snapshot_vault_item_history() FROM authenticated;

DROP TRIGGER IF EXISTS vault_items_snapshot_history ON public.vault_items;
CREATE TRIGGER vault_items_snapshot_history
  BEFORE UPDATE ON public.vault_items
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_vault_item_history();
