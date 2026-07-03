# PROGRESS_LOG.md

Bitácora de trabajo autónomo. Un bloque por fase completada.

---

## Fase 1 — Inicialización y configuración ✅

**Fecha:** 2026-07-03

### Qué se implementó

- **Next.js 16.2.10** (App Router, TS estricto, Turbopack). Scaffold creado con `create-next-app` en un directorio temporal (lowercase) y movido a `VaultHub/` porque npm rechaza nombres con mayúsculas.
- **TypeScript strict** con opciones extra: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`.
- **Tailwind CSS v4** (via `@tailwindcss/postcss`).
- **shadcn/ui** inicializado con preset por defecto `base-nova` (Base UI + Tailwind v4). Componente `Button` y `lib/utils.ts` generados.
- **ESLint 9** con `eslint-config-next` + `eslint-config-prettier` (flat config).
- **Prettier** con `prettier-plugin-tailwindcss`, `.prettierrc.json` y `.prettierignore`.
- **Estructura de carpetas** completa según `CLAUDE.md`: `app/ components/ features/ hooks/ services/ repositories/ lib/crypto/ store/ types/ utils/ validators/ constants/ supabase/migrations/ middleware/ styles/` (con `.gitkeep`).
- **`.env.example`** con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `.env*` en `.gitignore`.
- **Clientes Supabase** en `lib/supabase/`: `env.ts` (validación de env vars), `client.ts` (browser via `createBrowserClient`), `server.ts` (Server Components via `createServerClient` + Next.js `cookies()`), `middleware.ts` (helper para refresh de sesión en proxy).
- **`proxy.ts`** en la raíz (Next.js 16 renombró `middleware` → `proxy`; se usa el nuevo nombre) — invoca `updateSupabaseSession` para mantener la sesión de Supabase viva en cada request.
- Scripts en `package.json`: `dev`, `build`, `start`, `lint`, `format`, `format:check`, `typecheck`.

### Decisiones técnicas y por qué

- **Next.js 16 (no 14):** `plan.md` dice "14+". Se usó la versión más reciente estable (16.2.10) que trae React 19 y Turbopack por defecto. Trade-off consciente: menos material de referencia externo, pero mejor DX y menos deuda futura.
- **shadcn/ui preset `base-nova` (Base UI en vez de Radix):** es el default actual de shadcn CLI y funciona nativo con Tailwind v4. Se aceptó el default para no bloquear la fase. Si más adelante se necesitan primitives Radix específicos, se puede migrar.
- **Estructura Next 16 `proxy.ts` en vez de `middleware.ts`:** `middleware.ts` compila pero emite un warning de deprecación. Se renombró a `proxy.ts` con `export function proxy(...)`. El archivo helper `lib/supabase/middleware.ts` conserva el nombre porque describe el patrón oficial de Supabase docs.
- **Cliente Supabase server en `lib/supabase/server.ts` async:** en Next 15+ `cookies()` es async — se propaga async por todos los usos.
- **`env.ts` con throw en top-level:** falla temprano si faltan vars en runtime. En build actual no se importa desde ninguna página, así que no rompe `next build` sin `.env.local`. Se documentará el requisito en README de Fase 8.
- **TypeScript path alias `@/*` apuntando al root:** consistente con el default de create-next-app y con `components.json` de shadcn.

### Pendiente / dudas

- **`.env.local` no creado aún.** El usuario dijo que no le pidiera keys manualmente. En Fase 2 se obtendrán vía Supabase CLI (`supabase status` o el MCP tool `mcp__claude_ai_Supabase__get_project_url` + `get_publishable_keys`).
- **Vulnerabilidad moderada `postcss <8.5.10`** (transitiva de Next 16). `npm audit fix --force` sugiere downgrade de Next a 9.x — inaceptable. Se deja anotado; PostCSS solo compila CSS en build, XSS mitigado (no hay input de usuario en el pipeline de CSS).
- **shadcn instaló `shadcn@^4.12.0` como *dependency* de la app** (no devDep). Es solo la CLI local; no se importa en runtime. Se dejará así por ahora; si molesta al tamaño del bundle, se mueve a devDependencies en Fase 8.
- El repo git actual está a nivel `Desktop/` (no `VaultHub/`). Los commits se hacen desde ahí con paths de subdirectorio.

### Verificación

- `npm run typecheck` ✅ sin errores
- `npm run lint` ✅ sin errores
- `npm run build` ✅ compila y genera rutas `/` y `/_not-found` correctamente. Proxy detectado como middleware.
- Formato aplicado con Prettier a todos los archivos escritos.

---

## Fase 2 — Base de datos (PARCIAL — bloqueada la aplicación) ⚠️

**Fecha:** 2026-07-03

### Estado

- Migraciones SQL diseñadas, escritas y commiteadas en `supabase/migrations/`.
- Aplicación (`supabase db push`) **bloqueada**: no hay proyecto Supabase linked ni proyecto llamado "VaultHub". Ver `DECISIONS_NEEDED.md` §1.

### Qué se implementó (código escrito, no aplicado a DB remota)

11 migraciones numeradas cronológicamente:

1. `20260703000001_extensions_enums_helpers.sql` — pgcrypto, ENUMs (`vault_item_type`, `share_permission`, `audit_action`), función trigger `set_updated_at()`.
2. `20260703000002_profiles.sql` — perfil 1:1 con `auth.users`. Salt PBKDF2 auto-generado por trigger `handle_new_user()`, `kdf_iterations` con CHECK ≥600k, `auto_lock_minutes` con CHECK 1–60 (default 5). RLS: SELECT/UPDATE propios; INSERT bloqueado (solo el trigger crea profiles); DELETE bloqueado (cascada desde auth.users).
3. `20260703000003_categories.sql` — nombre cifrado (name_ciphertext + name_iv). RLS full-own.
4. `20260703000004_tags.sql` — igual, join a items vía `item_tags`.
5. `20260703000005_vault_items.sql` — payload cifrado como un único blob JSON por item. Índices parciales para (activos: user + type + favorite + updated_at desc), (papelera), (categoría). Soft-delete con `deleted_at`. RLS full-own.
6. `20260703000006_item_tags.sql` — N:N con `user_id` redundante para policy simple. Sin UPDATE (relaciones son inmutables).
7. `20260703000007_password_history.sql` — historial cifrado, insert-only lógicamente (aunque DELETE permitido para rotación manual).
8. `20260703000008_shared_items.sql` — infra para compartir. Guarda clave simétrica del item re-cifrada con clave pública del recipient — **pendiente diseño par asimétrico por usuario en Fase 7**. Policy extra en `vault_items` permite SELECT si el recipient tiene un share activo (no expirado).
9. `20260703000009_audit_log.sql` — insert-only para el user (sin UPDATE/DELETE policies → RLS niega por default).
10. `20260703000010_trusted_devices.sql` — fingerprint client-side + `is_trusted` + `trusted_until`.
11. `20260703000011_storage_encrypted_attachments.sql` — bucket privado `encrypted-attachments`. Convención de path `{user_id}/{item_id}/{attachment_id}.enc`. Policies en `storage.objects` filtran por primer segmento del path.

### Decisiones técnicas y por qué

- **Cifrado por ítem = un único blob JSON** (`payload_ciphertext` + `payload_iv`) en vez de campo-por-campo. Trade-off: la búsqueda por nombre/URL exige descifrar client-side (aceptable en vaults típicos <1000 ítems). Ventaja: menos metadata leakeable al server, atomicidad, menor superficie de bugs de "olvidé cifrar este campo".
- **Nombres de categoría y tag se cifran también.** `CLAUDE.md` ofrece la opción de no cifrar "nombre de la plataforma" — se eligió cifrar (más zero-knowledge). Reversible sin migración destructiva si se decide lo contrario.
- **Auto-lock default = 5 minutos, CHECK 1–60.** Decisión conservadora. Usuario puede ajustar en settings.
- **`kdf_iterations` en cada profile (no constante global).** Permite migrar cost factor sin invalidar vaults previos.
- **`shared_items.owner_id <> shared_with_id`** (CHECK). Constraint UNIQUE en `(vault_item_id, shared_with_id)` para evitar duplicados.
- **Policies RLS sin UPDATE en `audit_log`** — bitácora inmutable por diseño (forensics).
- **Storage bucket estrictamente `application/octet-stream`** — bloquea uploads sin cifrar (aunque en Zero-Knowledge el cliente siempre debería mandar blob cifrado, la restricción es una red de seguridad extra).
- **`ON DELETE CASCADE` universal desde `profiles.id`** — si el usuario borra su cuenta, TODO su vault desaparece atómicamente.

### Pendiente / dudas

- **Aplicación real de migraciones bloqueada.** Ver `DECISIONS_NEEDED.md` §1.
- **Verificación "corren limpias desde cero" — pendiente.** Al desbloquear, correr `supabase db reset` en local o `supabase db push` en remoto y confirmar sin errores.
- **Par asimétrico por usuario para `shared_items`** — decisión de diseño para Fase 7 (usar `crypto.subtle` con RSA-OAEP-4096 o ECDH-P256 + AES-KW). Se anotará en `DECISIONS_NEEDED.md` cuando se llegue a esa fase si sigue sin resolverse.
- **`audit_log.insert` desde cliente es falseable.** Aceptable para MVP (auditoría es más para el usuario que para admin). Si se necesita auditoría no repudiable, mover a Edge Function con `service_role`.

### Verificación

- ⏸ `supabase db push` — bloqueado (no hay proyecto linked).
- ✅ Sintaxis SQL revisada; usa solo constructs estándar de Postgres 15+ y patrones Supabase (`auth.uid()`, `storage.buckets`, `storage.objects`, triggers `SECURITY DEFINER` con `search_path`).

---
