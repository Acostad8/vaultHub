-- =====================================================================
-- 20260703000002_profiles
-- Perfil de usuario. Una fila por auth.users. Guarda SOLO metadata no
-- sensible + el salt PBKDF2 (publico, no secreto) + iteraciones KDF
-- (permite subir cost factor sin romper vaults viejos).
-- La master password NUNCA se guarda aqui ni en ningun lado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  -- PK compartida con auth.users. Cascada de borrado: si se elimina el
  -- usuario en auth, el vault entero desaparece.
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email cacheado (auth.users tambien lo tiene; util para joins evitando
  -- cruzar schemas y para mostrar en UI sin llamadas extra).
  email                 TEXT NOT NULL,

  -- Nombre para mostrar. Metadata no sensible.
  display_name          TEXT,

  -- Salt PBKDF2 unico por usuario. NO secreto (OWASP: el salt puede vivir
  -- en la DB en claro). Base64 (16-32 bytes). Se genera en el registro y
  -- NO se rota (rotarlo requeriria re-cifrar todo el vault).
  master_password_salt  TEXT NOT NULL,

  -- Iteraciones PBKDF2 usadas para derivar la master key. Se guarda para
  -- permitir subir el cost factor a futuro sin romper vaults existentes
  -- (mientras no se cambie, cada usuario deriva con las mismas iters).
  -- Minimo permitido = 600_000 (OWASP 2023). El CHECK bloquea downgrades.
  kdf_iterations        INTEGER NOT NULL DEFAULT 600000 CHECK (kdf_iterations >= 600000),

  -- Auto-lock: minutos de inactividad tras los que la master key se limpia
  -- de memoria. Metadata no sensible. Default conservador = 5 min.
  auto_lock_minutes     INTEGER NOT NULL DEFAULT 5 CHECK (auto_lock_minutes BETWEEN 1 AND 60),

  -- Timestamp del ultimo unlock exitoso. Solo metadata; no revela nada
  -- sobre el contenido del vault.
  last_unlock_at        TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- Trigger: al crear un usuario en auth.users, crear su profile automatico
-- con salt aleatorio de 32 bytes (base64). El cliente puede reemplazarlo
-- despues si prefiere generar el salt via Web Crypto, pero tener uno por
-- default evita estado inconsistente (usuario auth sin profile).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, master_password_salt)
  VALUES (
    NEW.id,
    NEW.email,
    encode(gen_random_bytes(32), 'base64')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: solo el dueño ve su propio profile.
-- Por que: profile contiene salt e iteraciones KDF; aunque ninguno es
-- secreto por si mismo, filtrar por usuario es principio de minimo
-- privilegio y evita fingerprinting entre usuarios.
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: solo el dueño actualiza campos permitidos. Nota: no se puede
-- restringir columnas via RLS puro; se hace en la capa de repositorio
-- (services/profile.ts) — RLS solo bloquea filas ajenas.
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: no se permite desde cliente. El profile se crea via trigger
-- handle_new_user() al registrarse. Esto elimina la posibilidad de que un
-- usuario cree profile con salt controlado por atacante.
-- (No hay policy INSERT — RLS por default niega.)

-- DELETE: no se permite. El profile se elimina en cascada cuando se
-- borra el auth.users correspondiente (esto lo hace admin, no el cliente).
