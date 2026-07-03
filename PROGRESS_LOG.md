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
