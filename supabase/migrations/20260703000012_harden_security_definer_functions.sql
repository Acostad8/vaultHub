-- =====================================================================
-- 20260703000012_harden_security_definer_functions
-- Cierra 3 warnings del Supabase advisor:
--   (a) set_updated_at() no tenia search_path fijo -> vulnerable a
--       search_path injection si alguien crea schema/objetos con nombres
--       shadow. Fijamos search_path = pg_catalog, public.
--   (b) handle_new_user() es SECURITY DEFINER y estaba callable via
--       /rest/v1/rpc/handle_new_user por los roles anon y authenticated.
--       Es un trigger — nada la llama directamente desde la API PostgREST.
--       Revocamos EXECUTE de PUBLIC/anon/authenticated para que solo el
--       trigger (que corre como propietario) pueda invocarla.
-- =====================================================================

-- (a) search_path fijo en set_updated_at
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog, public;

-- (b) handle_new_user solo la llama su trigger
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
