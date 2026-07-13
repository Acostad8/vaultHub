# Despliegue en Vercel

Guía completa para llevar VaultHub a producción manteniendo el principio Zero-Knowledge intacto.

## Requisitos previos

- Proyecto Supabase creado y con migraciones aplicadas (`supabase db push`).
- Repo en GitHub/GitLab/Bitbucket.
- Dominio propio (opcional pero recomendado para HSTS efectivo).

## 1. Importar el repo en Vercel

- [vercel.com/new](https://vercel.com/new) → Import Git Repository.
- Framework preset: **Next.js** (auto-detectado — Next 16 con Turbopack).
- Build command / output: defaults. No cambiar `Root Directory`.
- Node version: default (Vercel usa la última LTS soportada).

## 2. Variables de entorno

**Settings → Environment Variables**, tanto en Production como en Preview:

| Variable | Valor | Alcance |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Production + Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (Supabase → Settings → API) | Production + Preview |

**Nunca** agregues `SERVICE_ROLE_KEY`. La app no la usa, y es un secreto de administrador total (RLS bypass). Ya hubo incidentes de exposición en otros proyectos — extremar cuidado.

La anon key es segura del lado cliente: RLS y las políticas por tabla la limitan.

## 3. Deploy inicial

- Push a `main` → Vercel dispara un build automático.
- Verificar en el dashboard: build ~1-2 min, sin errores.
- URL provisional: `https://<proyecto>.vercel.app`.

## 4. Redirect URLs en Supabase

**Authentication → URL Configuration**:

- **Site URL:** `https://<tu-dominio-final>` (si aún no hay custom domain, usa `https://<proyecto>.vercel.app`).
- **Redirect URLs (allow list):**
  - `https://<proyecto>.vercel.app/auth/callback`
  - `https://<proyecto>.vercel.app/reset-password`
  - Para preview deployments (opcional pero útil): `https://<proyecto>-*.vercel.app/auth/callback`
  - Cuando actives custom domain: añadir `https://<dominio>/auth/callback` y `https://<dominio>/reset-password` también.

Sin esto, verificación de email, reset password y OAuth redirigen a localhost.

## 5. Google OAuth (opcional)

Requiere configuración cruzada Supabase ↔ Google Cloud. Ver `DECISIONS_NEEDED.md` §2 y `docs/OAUTH_TOTP_VERIFICATION.md` §0-1 para el flujo detallado.

En Vercel: nada extra. Sin claves en env vars — Supabase intermedia el flow.

En Google Cloud:
- OAuth Client Web → Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
- Authorized JavaScript origins: `https://<proyecto>.vercel.app` + custom domain si aplica.

En Supabase dashboard: Authentication → Providers → Google → habilitar + pegar Client ID/Secret.

## 6. Dominio custom + HTTPS + HSTS

1. **Vercel Dashboard → Settings → Domains → Add domain.** Introduce `vault.tudominio.com` (por ejemplo).
2. Configurar el CNAME/A record que Vercel indica.
3. Vercel emite certificado Let's Encrypt automáticamente (~2 min).
4. **HSTS ya está en `next.config.ts`** (`max-age=63072000; includeSubDomains; preload`). No requiere configuración adicional; los headers se emiten para todas las rutas.
5. Para inclusión en la lista HSTS preload de navegadores (opcional): [hstspreload.org](https://hstspreload.org) tras verificar el dominio en HTTPS estable ≥1 semana.

## 7. Sentry / error reporting (opcional, respetar Zero-Knowledge)

VaultHub NO incluye Sentry por defecto. Si lo agregas:

- **REGLA DURA:** el `beforeSend` de Sentry debe filtrar antes de enviar:
  - Nunca capturar el contenido de forms de master password.
  - Nunca enviar el estado de Zustand `useVaultLock` (contiene la master key en runtime).
  - Nunca serializar `payload` de items descifrados en breadcrumbs.
- Preferir Sentry auto-instrumentation solo para errores server-side (route handlers, middleware) que no ven data descifrada.
- Alternativa segura: `console.error` + `logAudit` (que ya escribe a `audit_log` con RLS por user, sin metadata sensible).

## 8. Headers de seguridad configurados

`next.config.ts` emite:

| Header | Valor | Motivo |
|---|---|---|
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | HSTS 2 años |
| X-Frame-Options | DENY | Clickjacking |
| X-Content-Type-Options | nosniff | MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | No filtrar URL exacta a terceros |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), payment=(), usb=() | Denegar APIs no usadas |
| Content-Security-Policy | Whitelist estricta | Bloquea inline scripts externos, restringe connect a Supabase + HIBP |

Verificar en producción: DevTools → Network → cualquier response → tab Headers.

## 9. Verificación end-to-end post-deploy

Flujo completo con un usuario nuevo:

- [ ] `/register` con email real → llega correo de verificación con link a `<dominio>/auth/callback?code=…`.
- [ ] Callback redirige a la home autenticada → aparece `/setup-vault`.
- [ ] Setup con master password ≥ 12 chars → PBKDF2 tarda ~1s en el navegador (normal).
- [ ] Crear un item password → aparece en `/vault`.
- [ ] Logout, login otra vez, unlock → mismo item visible.
- [ ] **Desde otro navegador (ventana incógnito o dispositivo):** login + unlock → mismo vault descifrado.
- [ ] DevTools → Network en una request de `/rest/v1/vault_items`: verificar que solo viajan `payload_ciphertext` + `payload_iv` (nunca texto plano).
- [ ] DevTools → Application → Local Storage: NO debe haber master key ni datos descifrados. Sí puede haber `vaulthub_device_id` (UUID op) y `theme`.
- [ ] Response headers de cualquier página muestran los 6 headers de seguridad.

## 10. Migraciones futuras

Las migraciones NO se aplican desde Vercel. Siempre desde tu máquina local:

```bash
supabase db push
```

Push a `main` re-despliega la app pero no toca la DB.

## Troubleshooting

- **"Auth callback error" en producción:** falta URL en Redirect URLs (paso 4).
- **PBKDF2 tarda >5s:** dispositivo lento. Reducir `kdf_iterations` en `profiles` NO es correcto (compromete seguridad); mejor sugerir dispositivo más potente o iOS/Android con Web Crypto acelerado.
- **"Cross-origin" errores desde el navegador:** revisar CSP en `next.config.ts` — puede que agregaste un CDN nuevo que hay que whitelist.
- **HSTS bloquea preview deploys en localhost:** solo aplica al dominio custom; los `*.vercel.app` no propagan HSTS a `localhost`.

## Rollback

Vercel Dashboard → Deployments → seleccionar un deploy anterior → "Promote to Production". No requiere rebuild.

Para rollback de DB (si una migración salió mal): `supabase migration new revert_XX` con el SQL de rollback + `supabase db push`. Nunca editar el archivo de migración ya aplicado.
