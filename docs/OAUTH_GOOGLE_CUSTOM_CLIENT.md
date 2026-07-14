# Guía: OAuth Client propio de Google (branding VaultHub)

## Objetivo

Reemplazar el OAuth client compartido de Supabase por uno propio en Google Cloud, de modo que en la pantalla de consentimiento de Google el usuario vea **"VaultHub quiere acceder a…"** en lugar del host crudo `jawefdwrfjsnclnbwxby.supabase.co`.

## Qué NO cambia

- Cero cambios de código. `signInWithOAuth({ provider: "google" })` en `services/auth.ts:55` sigue igual.
- Callback en `app/auth/callback/route.ts` sigue igual.
- Flujo PKCE + intercambio de código + chequeo AAL para TOTP: idéntico.
- El dominio del redirect final URL sigue siendo `<project-ref>.supabase.co/auth/v1/callback` (Google lo requiere para validar), pero **ya no se muestra en primer plano** al usuario — se muestra el nombre y logo del OAuth app.

## Prerrequisitos

- Cuenta Google con acceso a [Google Cloud Console](https://console.cloud.google.com).
- Acceso al dashboard de Supabase del proyecto `jawefdwrfjsnclnbwxby`.
- Logo de VaultHub en PNG cuadrado (mínimo 120×120, recomendado 512×512, fondo transparente o sólido).
- Dominio de la app en prod (para "Application home page" y "Privacy policy URL"). Si aún no hay dominio prod, usa `http://localhost:3000` temporalmente y actualiza después.

## Parte 1 — Google Cloud Console

### 1.1 Crear proyecto

1. Abre https://console.cloud.google.com.
2. Selector de proyecto (arriba a la izquierda) → **New Project**.
3. **Project name:** `VaultHub` (o el que prefieras).
4. Organization / Location: deja los defaults (sin organización si es cuenta personal).
5. **Create**. Espera 10–20s a que se cree y selecciónalo.

### 1.2 Habilitar Google Identity API (People API)

1. Menú lateral → **APIs & Services** → **Library**.
2. Busca `Google People API` → clic → **Enable**.
   - Es la que Supabase usa para leer email + perfil básico tras el consent.

### 1.3 OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**.
2. **User Type:** `External` → **Create**.
   - `Internal` solo aplica si tu cuenta es Google Workspace y quieres restringir a tu organización.

**Pantalla 1 — App information:**
- **App name:** `VaultHub`
- **User support email:** tu email (aparecerá en el consent screen).
- **App logo:** sube el PNG de VaultHub.
- **App domain** (opcional pero recomendado):
  - Application home page: `https://vaulthub.tu-dominio.com` (o `http://localhost:3000` temporal).
  - Application privacy policy link: URL de política de privacidad. **Requerido para publicar en producción** — si aún no existe, deja vacío por ahora (funciona en Testing).
  - Application terms of service link: opcional.
- **Authorized domains:** agrega `supabase.co` (para que valide el redirect URI de Supabase). Cuando tengas dominio prod, agrégalo también.
- **Developer contact information:** tu email.
- **Save and Continue**.

**Pantalla 2 — Scopes:**
- Clic en **Add or Remove Scopes**.
- Marca:
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
  - `openid`
- **Update** → **Save and Continue**.

**Pantalla 3 — Test users:**
- Mientras el app esté en modo `Testing`, solo estos emails pueden loguearse.
- Añade tu email principal + emails de prueba.
- **Save and Continue** → **Back to Dashboard**.

> **Publishing status:** el app queda en **Testing** por defecto. Google muestra un banner amarillo "This app isn't verified" a los test users, pero funciona. Para pasar a **In production** sin verificación, Google permite hasta 100 usuarios totales. Si vas a superar eso o quieres eliminar el banner, hay que someter a **verification** (proceso de días a semanas, requiere privacy policy real, video del flujo, etc). Para MVP: quédate en Testing o publica sin verificar hasta 100 users.

### 1.4 Crear OAuth Client ID

1. **APIs & Services** → **Credentials**.
2. **+ Create Credentials** → **OAuth client ID**.
3. **Application type:** `Web application`.
4. **Name:** `VaultHub Web` (interno, no visible al usuario).
5. **Authorized JavaScript origins:** déjalo vacío (Supabase maneja el flujo, no la app directamente).
6. **Authorized redirect URIs:** clic **+ Add URI** y pega **exactamente**:
   ```
   https://jawefdwrfjsnclnbwxby.supabase.co/auth/v1/callback
   ```
   - Esta URL es fija de Supabase. Google la usará solo para validar; el usuario ya no la ve en primer plano gracias al branding del consent screen.
7. **Create**.
8. Aparece modal con **Client ID** y **Client Secret**. Cópialos ya — el secret se puede volver a ver, pero es más fácil ahora.

## Parte 2 — Supabase Dashboard

1. https://supabase.com/dashboard → proyecto `jawefdwrfjsnclnbwxby`.
2. **Authentication** → **Providers** → **Google**.
3. **Enable Sign in with Google:** ON (si ya estaba, sigue).
4. **Client ID (for OAuth):** pega el Client ID de Google.
5. **Client Secret (for OAuth):** pega el Client Secret de Google.
6. **Authorized Client IDs:** déjalo vacío (solo aplica para OAuth nativo mobile).
7. **Skip nonce checks:** OFF.
8. **Save**.

> Nota: si antes usabas el OAuth compartido de Supabase (sin Client ID propio) los usuarios ya registrados **siguen funcionando** — el `provider_id` de Google es el mismo (sub del token), independiente del client. No hay migración de usuarios.

## Parte 3 — Verificación

1. Reinicia dev server (`npm run dev`) por si acaso.
2. Modo incógnito → `/login` → **Continuar con Google**.
3. **Antes:** encabezado decía "Ir a jawefdwrfjsnclnbwxby.supabase.co".
4. **Después:** encabezado debe decir "Iniciar sesión en VaultHub" con el logo.
5. Consiente. Se redirige a `/auth/callback?code=…` → sesión establecida.
6. Correr flujo completo del runbook: [`OAUTH_TOTP_VERIFICATION.md`](./OAUTH_TOTP_VERIFICATION.md).

## Troubleshooting

- **"Access blocked: authorization error"** → email no está en la lista de test users. Agrégalo en Consent Screen → Test users.
- **"redirect_uri_mismatch"** → el redirect URI en Google Cloud no coincide **exacto** con el de Supabase. Revisar mayúsculas, `https://`, sin slash final. Debe ser exactamente `https://jawefdwrfjsnclnbwxby.supabase.co/auth/v1/callback`.
- **"invalid_client"** en Supabase logs → Client ID o Secret pegado con espacio inicial/final, o del proyecto Google equivocado. Rehacer copiado.
- **Aparece "unverified app" warning** → normal en Testing. Los test users pueden clicar "Advanced" → "Go to VaultHub (unsafe)" para continuar. Para eliminar: verificar el app o mantenerlo en Testing.

## Producción

Cuando la app tenga dominio prod:

1. Google Cloud → OAuth consent screen → editar → agregar dominio prod a **Authorized domains**.
2. Actualizar **Application home page** y **Privacy policy URL** al dominio real.
3. Google Cloud → Credentials → OAuth client → editar → **Authorized redirect URIs** sigue siendo el de Supabase (no cambia).
4. Supabase → Authentication → URL Configuration → **Site URL** = dominio prod. **Redirect URLs** = `https://tu-dominio.com/auth/callback`.
5. Si esperas >100 usuarios: someter a Google verification. Requiere:
   - Privacy Policy hospedada y accesible.
   - Video del flujo OAuth (screencast).
   - Dominio verificado en Google Search Console.
   - Formulario de verificación en Consent Screen → "Prepare for verification".
