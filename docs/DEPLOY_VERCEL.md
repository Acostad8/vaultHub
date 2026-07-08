# Despliegue en Vercel

## Requisitos previos

- Proyecto Supabase ya creado y con migraciones aplicadas (`supabase db push`).
- Repo en GitHub/GitLab/Bitbucket.

## Pasos

1. **Importar el repo en Vercel** — [vercel.com/new](https://vercel.com/new). Framework preset: Next.js (auto-detectado). Build command y output: defaults.

2. **Variables de entorno** (Settings → Environment Variables, para Production + Preview):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://TU_REF.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (Settings → API en Supabase) |

   **NUNCA** agregues `SERVICE_ROLE_KEY` — la app no la necesita y es un secreto de administrador total. La anon key es segura en el cliente: RLS la limita.

3. **Deploy** — push a `main` dispara build automático.

4. **Configurar URLs en Supabase** (Authentication → URL Configuration):
   - Site URL: `https://tu-app.vercel.app`
   - Redirect URLs: `https://tu-app.vercel.app/auth/callback` (+ la de previews si quieres: `https://*-tu-team.vercel.app/auth/callback`)

   Sin esto, verificación de email / reset password / OAuth redirigen a localhost.

5. **Google OAuth (opcional)** — ver `DECISIONS_NEEDED.md` #2: crear OAuth Client en Google Cloud con redirect `https://TU_REF.supabase.co/auth/v1/callback` y habilitar el provider en Supabase.

## Verificación post-deploy

- [ ] `/login` carga y registra usuario nuevo (llega email de confirmación).
- [ ] Setup del vault + unlock funcionan (deriva PBKDF2 en el navegador — puede tardar ~1s, normal).
- [ ] Crear item, ver listado, favicon del hexágono visible.
- [ ] DevTools → Network: verificar que a Supabase solo viajan `payload_ciphertext`/`iv`, nunca texto plano.
- [ ] DevTools → Application → Local Storage: no debe existir master key ni datos descifrados (solo `vaulthub_device_id` y tema).

## Notas

- Las migraciones NO se aplican desde Vercel: siempre `supabase db push` desde tu máquina (CLI autenticado).
- El proxy de Next (`proxy.ts`) verifica sesión via JWKS local — sin roundtrips a Supabase por request; no requiere configuración extra en Vercel.
