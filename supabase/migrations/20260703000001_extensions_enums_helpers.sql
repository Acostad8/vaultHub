-- =====================================================================
-- 20260703000001_extensions_enums_helpers
-- Bases del schema: extensiones, ENUMs compartidos y funcion trigger
-- reutilizable para mantener updated_at.
-- =====================================================================

-- pgcrypto: usado por gen_random_uuid() y por posibles hashes k-anonymity
-- (SHA-1 para HaveIBeenPwned se hace client-side, pero pgcrypto es util
-- para otros helpers de infraestructura).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- ENUM: tipo de item en el vault. Metadata NO sensible (server necesita
-- saberlo para filtros, y no revela nada mas que la categoria general).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vault_item_type') THEN
    CREATE TYPE public.vault_item_type AS ENUM (
      'password',    -- credencial usuario/password
      'note',        -- nota segura de texto libre
      'api_key',     -- token/API key
      'ssh_key',     -- par de claves SSH
      'card',        -- tarjeta de credito/debito
      'identity',    -- documento de identidad, pasaporte, licencia
      'totp'         -- codigo TOTP standalone
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- ENUM: permiso de compartido. Read = solo desencripta y muestra.
-- Write = puede editar y guardar cambios.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'share_permission') THEN
    CREATE TYPE public.share_permission AS ENUM (
      'read',
      'write'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- ENUM: accion registrada en audit_log. Ampliable segun se implementen
-- mas flujos (Fase 7). Todos son eventos NO sensibles (metadata pura).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE public.audit_action AS ENUM (
      'login',
      'logout',
      'vault_unlock',
      'vault_lock',
      'item_create',
      'item_update',
      'item_delete',
      'item_restore',
      'item_share',
      'item_unshare',
      'export',
      'import',
      'password_change',
      'device_trust',
      'device_revoke'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- Funcion trigger para mantener updated_at consistente sin depender de
-- la app. Cada tabla con updated_at la referenciara en su propio trigger.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
