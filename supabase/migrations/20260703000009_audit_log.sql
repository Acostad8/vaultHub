-- =====================================================================
-- 20260703000009_audit_log
-- Registro de eventos de seguridad y actividad. Insert-only para el
-- usuario (no puede modificar ni borrar su propio historial — importante
-- para forensics). El purgado se hace desde admin/tarea agendada.
--
-- Ningun dato sensible aqui: solo la accion, timestamp, IP, user-agent y
-- metadata opcional en JSONB (que la app debe garantizar no contenga
-- ciphertext ni master key — solo IDs de recursos afectados).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action        public.audit_action NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_user_created_idx
  ON public.audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_action_idx
  ON public.audit_log(user_id, action, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: dueño ve su propio historial.
CREATE POLICY audit_log_select_own ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: dueño registra sus propios eventos. Nota: para eventos que la
-- app quiera atribuir de forma no falseable (ej. login exitoso), lo ideal
-- seria via Edge Function con service_role — pendiente de decidir en
-- Fase 7 si se necesita. Por ahora, el cliente los inserta.
CREATE POLICY audit_log_insert_own ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- SIN UPDATE ni DELETE: el usuario no puede alterar su bitacora. RLS por
-- default niega, y no se crea policy para esas operaciones.
