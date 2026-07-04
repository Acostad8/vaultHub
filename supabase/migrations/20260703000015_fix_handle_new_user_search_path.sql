-- =====================================================================
-- 20260703000015_fix_handle_new_user_search_path
-- Bug: en el proyecto Supabase la extension pgcrypto vive en el schema
-- `extensions` (default de plantillas recientes de Supabase). El trigger
-- handle_new_user tenia `SET search_path = public`, que NO incluye
-- `extensions`, asi que `gen_random_bytes(32)` fallaba con
-- "function gen_random_bytes(integer) does not exist" y toda la
-- transaccion de creacion de auth.users hacia rollback. Sintoma:
--   - Signup email/password: "Database error saving new user".
--   - OAuth Google: mismo error interno + redirect a /login con
--     `error=missing_code` (Supabase no emitio code porque el user
--     jamas se creo en DB).
--
-- Fix: search_path incluye `extensions` y la llamada usa el schema
-- calificado como defensa en profundidad por si un futuro `SET LOCAL`
-- lo cambia.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, master_password_salt)
  VALUES (
    NEW.id,
    NEW.email,
    encode(extensions.gen_random_bytes(32), 'base64')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Re-aplicar los revokes de la migracion 12 (CREATE OR REPLACE los
-- resetea a los defaults del owner).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
