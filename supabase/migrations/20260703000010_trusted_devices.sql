-- =====================================================================
-- 20260703000010_trusted_devices
-- Sesiones activas del usuario y dispositivos "confiables" (los que
-- pueden omitir 2FA en el proximo login segun politica del usuario).
--
-- Nombre de dispositivo y user-agent NO se consideran secretos aqui —
-- son metadata operativa. El fingerprint del dispositivo es un hash
-- generado client-side (algoritmo definido en Fase 7); el server solo
-- almacena el hash.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  device_name           TEXT NOT NULL,          -- nombre elegido por usuario
  device_fingerprint    TEXT NOT NULL,          -- hash generado client-side
  user_agent            TEXT,
  last_ip               INET,

  is_trusted            BOOLEAN NOT NULL DEFAULT FALSE,
  trusted_until         TIMESTAMPTZ,            -- expiracion opcional del trust
  last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un fingerprint no se registra dos veces por el mismo user.
  CONSTRAINT trusted_devices_unique_fingerprint UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS trusted_devices_user_last_seen_idx
  ON public.trusted_devices(user_id, last_seen_at DESC);

DROP TRIGGER IF EXISTS trusted_devices_set_updated_at ON public.trusted_devices;
CREATE TRIGGER trusted_devices_set_updated_at
  BEFORE UPDATE ON public.trusted_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY trusted_devices_select_own ON public.trusted_devices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY trusted_devices_insert_own ON public.trusted_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY trusted_devices_update_own ON public.trusted_devices
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY trusted_devices_delete_own ON public.trusted_devices
  FOR DELETE USING (auth.uid() = user_id);
