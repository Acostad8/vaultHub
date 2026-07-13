-- =====================================================================
-- 20260713000001_password_history_rotation
-- Rotacion automatica de password_history: al insertar una version nueva
-- para un vault_item, se borran las mas antiguas dejando solo las N mas
-- recientes. Constante N = 20 (ver constants/password-history.ts en el
-- cliente; mantener en sync).
--
-- Diseno:
--  - Trigger AFTER INSERT en password_history (por fila). Ejecuta un
--    DELETE de todas las filas del mismo vault_item_id cuyo archived_at
--    quede fuera del top-N mas reciente.
--  - SECURITY DEFINER + search_path fijo (mismo hardening del resto de
--    triggers): el DELETE necesita bypass de policies durante la escritura
--    del propio trigger, y el path bloquea la inyeccion via search_path.
--  - REVOKE EXECUTE cierra la superficie RPC al publico.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.prune_password_history_versions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  versions_to_keep CONSTANT INTEGER := 20;
BEGIN
  DELETE FROM public.password_history
  WHERE vault_item_id = NEW.vault_item_id
    AND id NOT IN (
      SELECT id
      FROM public.password_history
      WHERE vault_item_id = NEW.vault_item_id
      ORDER BY archived_at DESC, id DESC
      LIMIT versions_to_keep
    );
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prune_password_history_versions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prune_password_history_versions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prune_password_history_versions() FROM authenticated;

DROP TRIGGER IF EXISTS password_history_prune ON public.password_history;
CREATE TRIGGER password_history_prune
  AFTER INSERT ON public.password_history
  FOR EACH ROW
  EXECUTE FUNCTION public.prune_password_history_versions();
