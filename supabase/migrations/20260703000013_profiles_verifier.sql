-- =====================================================================
-- 20260703000013_profiles_verifier
-- Añade un "verifier" cifrado al profile — un bloque conocido cifrado
-- con la master key derivada del usuario. Al desbloquear, el cliente
-- vuelve a derivar la key con la password introducida y descifra el
-- verifier: si el descifrado devuelve el plaintext esperado, la password
-- es correcta.
--
-- El verifier NO revela la master password ni la master key al servidor.
-- Es un token publico cifrado; incluso si el ciphertext se filtra, un
-- atacante solo puede intentar bruteforce PBKDF2 (600k iters, salt propio).
--
-- Campos NULL hasta que el usuario complete el flow de "setup del vault"
-- por primera vez (elige master password distinta de la de cuenta).
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verifier_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS verifier_iv         TEXT,
  -- Timestamp del setup del vault. NULL = usuario aun no configuró
  -- master password (recien registrado o abandono el flow).
  ADD COLUMN IF NOT EXISTS vault_initialized_at TIMESTAMPTZ;

-- Consistencia: los dos campos del verifier van juntos o ninguno.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_verifier_pair_check
  CHECK (
    (verifier_ciphertext IS NULL AND verifier_iv IS NULL AND vault_initialized_at IS NULL)
    OR
    (verifier_ciphertext IS NOT NULL AND verifier_iv IS NOT NULL AND vault_initialized_at IS NOT NULL)
  );
