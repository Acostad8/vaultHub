-- =====================================================================
-- 20260708000002_sharing_keys
-- Compartir credenciales Zero-Knowledge (Fase 7).
--
-- Modelo cripto (todo client-side, Web Crypto API):
--   1. Cada usuario tiene un par RSA-OAEP (3072/SHA-256) generado en su
--      navegador. La PUBLICA se guarda en claro (es publica). La PRIVADA
--      se guarda cifrada con AES-256-GCM usando su master key — el server
--      nunca puede usarla.
--   2. Al compartir: el owner descifra el item, genera una clave AES-256
--      efimera K, cifra un SNAPSHOT del payload con K, y envuelve K con
--      la publica del destinatario (RSA-OAEP wrapKey).
--   3. El destinatario descifra su privada con SU master key, des-envuelve
--      K y descifra el snapshot. El server solo ve ciphertext.
--
-- El share es un snapshot: cambios posteriores del owner NO se propagan
-- (re-compartir para actualizar). Permission 'write' del enum queda
-- reservado — la UI solo emite 'read' por ahora.
-- =====================================================================

-- Par de claves de compartir en profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sharing_public_key_jwk        JSONB,
  ADD COLUMN IF NOT EXISTS sharing_private_key_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS sharing_private_key_iv         TEXT;

-- Snapshot del payload en shared_items (cifrado con la K efimera)
ALTER TABLE public.shared_items
  ADD COLUMN IF NOT EXISTS payload_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS payload_iv         TEXT,
  ADD COLUMN IF NOT EXISTS item_type          public.vault_item_type;

-- ---------------------------------------------------------------------
-- RPC: lookup de destinatario por email exacto.
-- SECURITY DEFINER para saltar el RLS de profiles (select_own), pero
-- devuelve SOLO id + clave publica — nada mas del profile. La clave
-- publica es publica por definicion; exponerla a usuarios autenticados
-- es exactamente su proposito.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sharing_recipient(recipient_email TEXT)
RETURNS TABLE (user_id UUID, public_key_jwk JSONB)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.sharing_public_key_jwk
  FROM public.profiles p
  WHERE lower(p.email) = lower(recipient_email)
    AND p.sharing_public_key_jwk IS NOT NULL
  LIMIT 1;
$$;

-- Solo usuarios autenticados pueden resolver destinatarios.
REVOKE ALL ON FUNCTION public.get_sharing_recipient(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sharing_recipient(TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- RPC: shares recibidos con email del owner (profiles esta cerrado por
-- RLS, asi que el join se hace aqui). Solo filas donde el caller es el
-- destinatario y el share no expiro.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_received_shares()
RETURNS TABLE (
  id UUID,
  vault_item_id UUID,
  owner_email TEXT,
  item_type public.vault_item_type,
  permission public.share_permission,
  encrypted_key_ciphertext TEXT,
  encrypted_key_iv TEXT,
  payload_ciphertext TEXT,
  payload_iv TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    s.id, s.vault_item_id, p.email, s.item_type, s.permission,
    s.encrypted_key_ciphertext, s.encrypted_key_iv,
    s.payload_ciphertext, s.payload_iv,
    s.expires_at, s.created_at
  FROM public.shared_items s
  JOIN public.profiles p ON p.id = s.owner_id
  WHERE s.shared_with_id = auth.uid()
    AND (s.expires_at IS NULL OR s.expires_at > NOW());
$$;

REVOKE ALL ON FUNCTION public.list_received_shares() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_received_shares() TO authenticated;
