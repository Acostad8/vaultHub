# DECISIONS_NEEDED.md

Cosas que la sesión autónoma no pudo resolver sin comprometer seguridad o sin input humano. Revisar y responder para desbloquear.

---

## 1. ~~Supabase — no hay proyecto vinculado~~ ✅ RESUELTO 2026-07-03

Usuario creó proyecto `vaulthub` (`jawefdwrfjsnclnbwxby`, us-east-1), corrió `supabase link`, configuró `.env.local`. Todas las migraciones (1-12) aplicadas. Advisors de seguridad limpios. Ver `PROGRESS_LOG.md` cierre de Fase 2.

---

## 2. Google OAuth — activación manual en dashboard Supabase

**Estado:** No bloqueante. El botón "Continuar con Google" está en `/login` y `/register`, pero al hacer click devuelve un error hasta que el provider esté configurado.

**Qué necesito de ti:**

1. Ir a Google Cloud Console → crear un OAuth 2.0 Client (Web application). Añadir como Authorized redirect URI: `https://jawefdwrfjsnclnbwxby.supabase.co/auth/v1/callback`.
2. Copiar Client ID y Client Secret.
3. En Supabase Dashboard → Authentication → Providers → Google → habilitar y pegar Client ID + Secret.
4. Confirmar en localhost que el flow completo funciona.

**Por qué no lo hice yo:** requiere credenciales de Google Cloud (fuera del alcance del CLI/MCP de Supabase) y confirmación de que el proyecto Google Cloud a usar es el correcto.
