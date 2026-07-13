# Runbook: verificación manual OAuth Google + TOTP 2FA

Última verificación: **pendiente** — correr una vez tras habilitar Google OAuth en Supabase dashboard (ver `DECISIONS_NEEDED.md` §2), marcar la fecha aquí y quedar como referencia para futuras verificaciones (deploys, cambios en `/auth/callback`, migraciones a MFA).

## 0. Prerrequisitos

- Proyecto Supabase enlazado (`supabase link` corrido).
- Provider **Google** habilitado en dashboard: Authentication → Providers → Google. Client ID / Client Secret pegados desde un OAuth Client de Google Cloud Console.
  - URL de callback en Google Cloud: `https://<project-ref>.supabase.co/auth/v1/callback`.
  - En prod: URL de la app en Site URL + Redirect URLs (Supabase Auth Settings).
- Una cuenta Google de prueba **sin uso previo** en la app (para probar registro + link).
- Una app TOTP: Google Authenticator, Aegis, 1Password, etc.
- La app corriendo local (`npm run dev`) o el deploy de prod.

## 1. Flujo OAuth (registro + login)

### 1.1 Registro con Google (usuario nuevo)

1. `/register` → click en botón `Continuar con Google`.
2. Se redirige al consent screen de Google. Consentir.
3. Google redirige a `/auth/callback?code=…`.
4. **Esperado:** `route.ts` intercambia el código, la sesión queda establecida. Se redirige al `next` param (por defecto `/`).
5. En la home aparece el `email` de la cuenta Google.
6. Redirect a `/setup-vault` porque es la primera sesión (no hay verifier).

**Verificación:** en Supabase Studio → Authentication → Users, aparece el usuario con `provider = google` y `email_confirmed_at` no nulo (Google verifica).

### 1.2 Login con Google (usuario existente)

1. Logout (`LogoutButton`). Ir a `/login`.
2. Click en `Continuar con Google`.
3. **Esperado:** callback sin re-consent (o con consent instantáneo si el usuario recuerda). Redirige a `/` con sesión activa.

## 2. Setup 2FA de cuenta (TOTP via Supabase MFA)

1. Con sesión activa y vault desbloqueado, ir a `/security`.
2. Click en `Activar 2FA` (TOTP).
3. **Esperado:** aparece QR + secreto base32 manual.
4. Escanear el QR con la app TOTP. **Alternativa:** copiar el secreto manualmente y pegarlo en la app.
5. Introducir el código de 6 dígitos que muestra la app en el input.
6. Click en `Verificar y activar`.
7. **Esperado:** toast de éxito. `/security` muestra el factor con estado `verified`.

**Verificación en Supabase:** Authentication → Users → click en el user → tab `MFA` muestra el factor TOTP.

## 3. Login con TOTP (usuario con 2FA activo)

### 3.1 Password login → challenge TOTP

1. Logout.
2. `/login` → email + password.
3. **Esperado:** middleware detecta AAL2 requerida, redirige a `/mfa`.
4. `/mfa` pide el código de 6 dígitos.
5. Introducir código actual de la app. Submit.
6. **Esperado:** sesión escalada a AAL2. Redirige a `/` o al `next`.

### 3.2 OAuth login → gate MFA

- **Nota importante:** el check de MFA en el form de login solo cubre password. Cuando el usuario entra vía Google OAuth, el callback `/auth/callback/route.ts` también debe verificar AAL y redirigir a `/mfa` si toca — esto se resolvió en el commit `988d5d7` (feat/fix). Verificar aquí:

1. Con 2FA activo, logout.
2. Entrar por Google (botón OAuth).
3. **Esperado:** tras el callback, se redirige a `/mfa`. Introducir código.
4. Redirige a `/`.

**Si NO redirige a `/mfa` desde OAuth:** bug regresivo. Revisar `app/auth/callback/route.ts`.

## 4. Dispositivo confiable + omisión de 2FA

1. En `/mfa` (o en `/security`), marcar la casilla `Confiar en este dispositivo por 30 días`.
2. Verificar código y entrar.
3. Logout y volver a login con password.
4. **Esperado:** el prompt de `/mfa` se omite en este dispositivo específico.
5. Abrir en otro navegador / ventana incógnito y hacer login.
6. **Esperado:** `/mfa` **sí** aparece — el trust es por-dispositivo.

**Verificación DB:** en `public.trusted_devices` aparece la fila con `trusted_until` a ~30 días.

## 5. Desactivación

1. `/security` → `Desactivar 2FA`. Requiere código o password reciente (patrón conservador).
2. **Esperado:** factor eliminado. Logout + login pide solo password.

## Checklist compacto

- [ ] 1.1 Registro Google → user creado en Supabase con provider=google.
- [ ] 1.2 Login Google existente → sin re-consent, sesión activa.
- [ ] 2 TOTP activado, factor verified.
- [ ] 3.1 Login password → prompt MFA → AAL2.
- [ ] 3.2 Login Google (con 2FA activo) → redirige a /mfa antes de la home.
- [ ] 4 Trust device 30d omite MFA en este dispositivo, la pide en otro.
- [ ] 5 Desactivar 2FA vuelve al flujo de solo-password.

## Registro de verificaciones

| Fecha | Ejecutor | Env | Resultado | Notas |
|---|---|---|---|---|
| _pendiente_ | | | | |
