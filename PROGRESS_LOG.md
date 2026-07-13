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

## Fase 4 — Módulo criptográfico Zero-Knowledge ✅

**Fecha:** 2026-07-03

Se saltó Fase 3 (auth) intencionalmente porque depende de Fase 2 (DB) que está bloqueada. Fase 4 es 100% client-side y no requiere Supabase.

### Qué se implementó

**`lib/crypto/`** — módulo puro, sin efectos secundarios, sin llamadas a red, testeable de forma aislada:

- `constants.ts` — parámetros fijos: `PBKDF2_DEFAULT_ITERATIONS=600_000`, `PBKDF2_MIN_ITERATIONS=600_000`, `PBKDF2_HASH="SHA-256"`, `AES_KEY_BITS=256`, `AES_ALGORITHM="AES-GCM"`, `AES_IV_BYTES=12`, `PBKDF2_SALT_BYTES=32`.
- `base64.ts` — `stringToBytes/bytesToString/bytesToBase64/base64ToBytes`. Chunked encoding para no explotar en payloads grandes.
- `random.ts` — `generateSalt/generateSaltBase64/generateIv/generateRandomBytes` con `crypto.getRandomValues`. Rechaza length inválido.
- `kdf.ts` — `deriveMasterKey({ password, saltBase64, iterations, extractable=false })`. Rechaza password vacía. Rechaza iteraciones < 600k. Clave por default no-extractable.
- `aes.ts` — `encryptBytes/decryptBytes`. IV nuevo por cada operación. Retorna `CipherEnvelope { ciphertext, iv }` en base64.
- `payload.ts` — `encryptPayload/decryptPayload` (JSON <-> bytes <-> cipher).
- `index.ts` — punto de entrada público con re-exports.

**`store/vault-lock.ts`** — Zustand store en memoria. Estado `{ state: "locked" } | { state: "unlocked", key, unlockedAt, lastActivity }`. Métodos `unlock/lock/touch/requireKey/checkTimeout`. Sin middleware `persist` (comentario explícito de que sería un bug).

**`hooks/use-auto-lock.ts`** — hook cliente que:
- Refresca `lastActivity` en click/keydown/mousemove/touchstart/scroll.
- Poll cada 15 s revisa timeout y llama `lock()` si vencido.
- `visibilitychange` → lock si `lockOnHidden` (default true).
- `beforeunload` → lock defensivo.

**`docs/CRYPTO_FLOW.md`** — flujo completo documentado: principios, algoritmos, registro, cifrado, descifrado, manejo de master key, auto-lock, compartir (Fase 7), HIBP (Fase 6), backup cifrado (Fase 7), y explícitamente amenazas fuera de alcance (XSS, malware local, server-side JS injection).

**Tests (`*.test.ts`) — 38 tests en 6 archivos:**
- `base64.test.ts` (5 tests) — roundtrips, unicode, empty, payload grande de 200 KB.
- `random.test.ts` (6 tests) — tamaños correctos, unicidad, formato base64, rechazo de inputs inválidos.
- `kdf.test.ts` (7 tests) — misma pwd+salt+iters produce claves equivalentes (verificado via encrypt/decrypt cross), pwd distinta falla, salt distinto falla, rechaza pwd vacía, rechaza iters < 600k, acepta 600k default, key es no-extractable.
- `aes.test.ts` (8 tests) — roundtrip, IVs únicos por operación (100 iteraciones sin colisión), key incorrecta falla, ciphertext tampered falla (auth tag GCM), IV tampered falla, payload vacío, payload de 100 KB.
- `payload.test.ts` (4 tests) — objeto plano, array, primitivos, estructura anidada con unicode.
- `store/vault-lock.test.ts` (8 tests) — locked por default, unlock guarda key, lock limpia, `requireKey` lanza si locked, `touch` actualiza lastActivity, `checkTimeout` lockea al vencer, no lockea si aún hay tiempo.

### Decisiones técnicas y por qué

- **`extractable: false` por default en la master key.** Blindaje ante XSS: si un atacante inyecta JS en la app desbloqueada, no puede exportar la key como bytes (aunque sí puede llamar encrypt/decrypt — documentado como amenaza fuera de alcance).
- **Blob JSON único por ítem (no campos separados).** Un único IV por operación → menos superficie de metadata, mejor atomicidad, imposible olvidar cifrar un campo. Documentado en CRYPTO_FLOW.md.
- **`useAutoLock` monta listeners `passive:true`.** No impide scroll/touch.
- **Poll de timeout cada 15 s en vez de setTimeout dinámico.** Simpler + resistente a suspensión de timers cuando la pestaña queda inactiva.
- **`lockOnHidden` default true.** Seguridad primero; si la UX se hace incómoda, se puede exponer como setting del usuario.
- **Cast `as BufferSource` en las llamadas a `crypto.subtle.*`.** Node 20 amplió el tipo de `Uint8Array.buffer` a `ArrayBufferLike`, incompatible con la definición estricta de `BufferSource` de lib.dom. El cast es un no-op en runtime; documentado.
- **Tests usan `PBKDF2_MIN_ITERATIONS` directamente (no 600k iterativo por test).** El test de "acepta default 600k" corre una vez con el valor real; los demás minimizan tiempo. Todo el suite corre en ~2.5 s.

### Pendiente / dudas

- **Salt regeneration por cambio de master password:** cuando se implemente cambio de master password (probablemente Fase 6/7), hay que decidir si se rota el salt o solo se re-cifra el vault entero con la nueva key. Fuera de alcance de Fase 4.
- **Integración con `services/` y `repositories/`:** el módulo cripto está listo; el consumo real llega en Fase 5 (CRUD).

### Verificación

- ✅ `npm run typecheck` — sin errores.
- ✅ `npm run lint` — sin errores.
- ✅ `npm run build` — compila; ninguna ruta rompe.
- ✅ `npm test` — 38/38 tests passing en 2.58 s.
- ✅ Regla dura auditada manualmente: NO hay `console.log` de secretos, NO hay imports de `localStorage/sessionStorage/IndexedDB`, NO hay middleware `persist` en el store.

---

## Fase 6 — Utilidades de password (PARCIAL) ✅

**Fecha:** 2026-07-03

Solo la parte client-side de Fase 6 (generador, fortaleza, HIBP). Los items que requieren datos del vault (resumen, duplicados) siguen bloqueados hasta Fase 3+5 (DB + auth).

### Qué se implementó

**`lib/password/`:**

- `alphabets.ts` — `LOWERCASE, UPPERCASE, DIGITS, SYMBOLS, AMBIGUOUS` como constantes tipadas.
- `generator.ts` — `generatePassword({ length, useLowercase, useUppercase, useDigits, useSymbols, excludeAmbiguous, requireEachSet })`. Usa `crypto.getRandomValues` con muestreo **sin sesgo modulo** (rechazo). `requireEachSet` inyecta al menos un char de cada set y luego Fisher-Yates para no filtrar la posición. No usa Math.random en ninguna parte.
- `strength.ts` — `evaluatePasswordStrength(password)` retorna `{ entropyBits, score 0-4, label, crackSecondsFast/Slow, crackDisplay, warnings }`. Entropía por pool (Shannon) menos penalizaciones por patrones (repetición, secuencia teclado, solo dígitos, etc). Documentada la limitación de honestidad: es cota SUPERIOR (asume aleatorio). Considerar zxcvbn en Fase 6 completa.
- `hibp.ts` — `sha1Hex(input)` + `checkHibp(password, { fetchImpl, signal })`. k-anonymity: envía SOLO los primeros 5 chars hex del SHA-1 al endpoint `api.pwnedpasswords.com/range/{prefix}` con header `Add-Padding: true`. Parsea respuesta línea por línea. Descarta entradas con `count = 0` (padding). Nunca loguea el password ni el hash completo. Error handling con `Error({cause})` para debug sin exponer detalles al usuario.
- `index.ts` — re-exports públicos.

**Tests (`*.test.ts`) — 30 tests adicionales, 68 total en el proyecto:**
- `generator.test.ts` (9 tests) — longitud, requireEachSet, excludeAmbiguous, solo digits, no colisiones en 50 llamadas, rechazos.
- `strength.test.ts` (10 tests) — vacío, muy corto, solo digits, ranges de score, detección de repetido/secuencia, entropia crece con longitud, formato legible de crackDisplay.
- `hibp.test.ts` (11 tests) — vectores SHA-1 conocidos (empty, "abc", "password"), URL enviada tiene EXACTAMENTE 5 chars hex, hash completo NO viaja, header Add-Padding presente, detección de breach, count=0 tratado como padding, propagación de errores de red y de status HTTP.

### Decisiones técnicas y por qué

- **Muestreo `unbiasedIndex(poolSize)`.** El clásico `bytes[0] % poolSize` sesga hacia índices bajos cuando poolSize no divide a 2^32. Se usa rejection sampling: descarta valores fuera del rango múltiplo de poolSize.
- **`requireEachSet` + Fisher-Yates shuffle.** Poner un char de cada set en las primeras N posiciones y no barajar filtraría entropía (los primeros N chars de un password con requireEachSet siempre vendrían de sets distintos en orden fijo). Shuffle previene eso.
- **Strength es cota superior consciente.** Documentado en el archivo. Zxcvbn está considerado para Fase 6 completa pero agrega ~800 KB al bundle — se evaluará contra los beneficios reales.
- **HIBP `Add-Padding: true`.** Sin este header, el tamaño de la respuesta puede filtrar información al observador de red sobre el prefijo consultado (todos los prefijos tienen tamaños ligeramente distintos según cuántos sufijos matchean).
- **HIBP con `fetchImpl` inyectable.** Permite tests unitarios sin hacer llamadas reales (los tests validan la ausencia de información sensible en la URL enviada — verificación de seguridad, no de red).
- **Sin `sha1` para hashing de otras cosas.** SHA-1 aquí es por requisito de la API de HIBP. No usar SHA-1 para nada más en el proyecto.

### Pendiente / dudas

- **Zxcvbn en el analizador de fortaleza** — decisión pendiente para Fase 6 completa.
- **Detección de duplicados y resumen del dashboard** — depende de Fase 3 (auth) + Fase 5 (CRUD).
- **UI del generador y del strength meter** — depende de que Fase 3+5 existan para tener contexto donde consumirlos. Los servicios ya están listos.

### Verificación

- ✅ `npm run typecheck` — sin errores.
- ✅ `npm run lint` — sin errores.
- ✅ `npm run build` — compila.
- ✅ `npm test` — 68/68 tests passing en 2.77 s.
- ✅ Auditoría rápida: `checkHibp` verifica en test que solo 5 chars hex viajan al endpoint.

---

## Fase 7 — TOTP (PARCIAL) ✅

**Fecha:** 2026-07-03

Solo el algoritmo puro. El wiring con UI (QR, códigos de recuperación) requiere Fase 3+5.

### Qué se implementó

**`lib/totp/`:**

- `base32.ts` — encode/decode RFC 4648 (upper, alfabeto A-Z 2-7). Case-insensitive en decode, ignora whitespace.
- `totp.ts` — `generateTotpCode(secretBase32, opts)`, `verifyTotpCode(...)`, `secondsUntilNextTotp(...)`. HMAC via `crypto.subtle` (soporta SHA-1/256/512). Truncación dinámica RFC 4226 §5.3. Contador de 8 bytes big-endian.
- `index.ts` — re-exports.

**Tests — 17 tests nuevos (85 total en el proyecto):**
- `base32.test.ts` (4 tests) — todos los vectores RFC 4648 §10 pasan en ambos sentidos, ignora whitespace/case, rechaza chars inválidos.
- `totp.test.ts` (13 tests) — **vectores RFC 6238 Appendix B (SHA-1, 8 dígitos) pasan exactos para T=59, 1111111109, 1111111111, 1234567890, 2000000000**. Default 6 dígitos verificado. Cambio entre ventanas. `secondsUntilNextTotp` matemática correcta. `verifyTotpCode` con window ±1 acepta ventana anterior y rechaza códigos muy viejos.

### Decisiones técnicas y por qué

- **Only Web Crypto HMAC.** Consistente con la regla del proyecto — sin librerías externas de crypto.
- **`opts.now` inyectable.** Sin esto, los tests dependerían del reloj del sistema. Es un patrón limpio para primitivas de time-based crypto.
- **Contador de 8 bytes vía `Math.floor(n / 256)`.** JS bitshift `>>` es 32 bits, no sirve. Los enteros seguros de JS (2^53) sobran para años.
- **`SHA-1` como default.** Google Authenticator y Aegis mainstream solo soportan SHA-1 en la práctica, aunque RFC 6238 admite SHA-256/SHA-512. La UI del onboarding debería recomendar SHA-1 para máxima compatibilidad de apps.

### Verificación

- ✅ `npm run typecheck` sin errores.
- ✅ `npm run lint` sin errores.
- ✅ `npm run build` compila.
- ✅ `npm test` — 85/85 tests passing en 2.86 s. **Los 5 vectores oficiales del RFC 6238 pasan byte a byte.**

---

## Fase 2 — Base de datos (CIERRE) ✅

**Fecha:** 2026-07-03 (tarde)

Bloqueo resuelto: usuario creó proyecto `vaulthub` (ref `jawefdwrfjsnclnbwxby`, us-east-1, ACTIVE_HEALTHY) y corrió `supabase link` + configuró `.env.local`.

### Qué pasó

1. Push inicial de migraciones 8-11 falló en la 8 con `ERROR: functions in index predicate must be marked IMMUTABLE (SQLSTATE 42P17)` — el índice `shared_items_active_idx` usaba `NOW()` (STABLE) en el WHERE. Postgres exige IMMUTABLE en predicados de índices parciales.
2. Verificación: `supabase migration list` mostró 1-7 aplicadas, 8-11 pending. `list_tables` confirmó rollback completo de la 8 (tabla `shared_items` no existía). Cada migración corre en su propia transacción, así que 8 falló limpia sin dejar estado parcial.
3. Corrección: reemplazado el índice parcial por uno completo `shared_items_recipient_expires_idx ON (shared_with_id, expires_at)` sin WHERE. El filtro `expires_at IS NULL OR expires_at > NOW()` ahora se aplica a nivel de query, apoyándose en range scan sobre el índice. Comentario en la migración explica el porqué.
4. `supabase db push --include-all` — 8, 9, 10, 11 aplicadas.
5. `list_tables` confirma 9 tablas (`profiles`, `categories`, `tags`, `vault_items`, `item_tags`, `password_history`, `shared_items`, `audit_log`, `trusted_devices`), todas con RLS habilitado.
6. `get_advisors security` marcó 3 warns:
   - `set_updated_at()` sin `search_path` fijo → posible search_path injection.
   - `handle_new_user()` (SECURITY DEFINER) exponía `/rest/v1/rpc/handle_new_user` a anon y authenticated.
7. Migración correctiva `20260703000012_harden_security_definer_functions.sql` — fija `search_path = pg_catalog, public` en `set_updated_at` y `REVOKE EXECUTE` de `handle_new_user` para PUBLIC/anon/authenticated (solo el trigger la puede invocar, corre como owner).
8. Push OK, `get_advisors` retorna `[]`. Base 100% limpia.

### Decisión sobre el índice

Optamos por (b) del prompt del usuario: **índice completo sin predicado**. Justificación: la query dominante para el destinatario es `WHERE shared_with_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`. Con el índice completo, Postgres puede hacer range scan por `shared_with_id` y filtrar `expires_at` en la mismalectura. Con opción (a) — índice parcial `WHERE expires_at IS NULL` — solo se acelera la mitad NULL; las filas con expiración futura harían table scan. Bajo (b) el índice sirve para ambos casos y para queries de admin ("todos mis shares emitidos").

### Verificación

- ✅ `supabase migration list` — todas locales y remotas coinciden.
- ✅ `list_tables` — 9 tablas + RLS.
- ✅ `get_advisors security` — 0 warnings, 0 errors.

---

## Fase 3 — Autenticación ✅

**Fecha:** 2026-07-03 (tarde)

### Qué se implementó

**Validación (`validators/auth.ts`):**
- Zod schemas para login, register, forgot-password, reset-password.
- `emailSchema` normaliza (trim + lowercase).
- Password de cuenta mínimo 10 chars (distinto del schema de master password — Fase 4).
- `confirmPassword` con `refine()` cross-field.

**Servicio (`services/auth.ts`):**
- `signInWithPassword`, `signUpWithPassword`, `signInWithGoogle`, `requestPasswordReset`, `updateAccountPassword`, `signOut`.
- Todos envuelven `createSupabaseBrowserClient()`. Cero acceso directo a `supabase.*` desde UI.
- `emailRedirectTo` y `redirectTo` derivan `window.location.origin` en runtime (evita hardcodear URL de deploy).
- `needsEmailConfirmation` se detecta por `!data.session` tras signup (patrón oficial de Supabase para "confirm email" activo).

**UI (`app/(auth)/`):**
- Route group `(auth)` con layout público centrado.
- `/login` — form con RHF + Zod resolver. Extrajo `LoginForm` a componente separado para envolverlo en `<Suspense>` (Next 16 exige boundary alrededor de `useSearchParams()` en rutas pre-renderizadas). Muestra `error` de query string si venía del callback. Respeta `next` param para redirigir tras login.
- `/register` — copy explicando explícitamente "esto es password de CUENTA, no la master password". Redirige a `/check-email` si `needsEmailConfirmation`.
- `/forgot-password` — copy claro: "esto NO recupera tu master password — si la perdiste, tu vault es irrecuperable por diseño".
- `/reset-password` — landing tras el link del email. Actualiza solo la password Supabase Auth.
- `/check-email` — info page tras signup con email pending. Server Component leyendo `searchParams` (Next 15+ patrón async).
- `GoogleButton` — client component reutilizado en login y register.
- `LogoutButton` — importante: llama `useVaultLock().lock()` **antes** de `signOut()`, para que la master key se limpie de memoria incluso si el signOut tarda.

**Callback (`app/auth/callback/route.ts`):**
- Route handler GET que hace `exchangeCodeForSession(code)` server-side (PKCE flow de Supabase).
- Redirige al `next` param al terminar. En error, vuelve a `/login?error=...` para que el usuario lo vea.

**Middleware (`lib/supabase/middleware.ts` + `proxy.ts`):**
- `getUser()` (NO `getSession()`) — verifica firma JWT contra Supabase; menos manipulable client-side.
- `PUBLIC_ROUTES = { /login, /register, /forgot-password, /reset-password, /check-email }` + cualquier `/auth/*`.
- `AUTH_ONLY_ROUTES = { /login, /register, /forgot-password }` — si el usuario ya tiene sesión y visita estas, redirige a `/`.
- Ruta protegida sin sesión → redirect a `/login?next=<original>` para volver tras login.

**Home protegida (`app/page.tsx`):**
- Convertida a Server Component. Lee `supabase.auth.getUser()` y muestra email + botón de logout. El middleware garantiza que no se llega aquí sin sesión.

### Decisiones técnicas y por qué

- **`getUser()` en middleware, no `getSession()`.** getSession lee la cookie sin validar firma; getUser hace HTTP a Supabase para validar (más lento pero seguro contra tampering). Trade-off aceptado — es una request/req, pero está detrás de auth middleware.
- **Password de cuenta ≥10 chars.** Supabase Auth default mínimo es 6, que es débil. 10 es un balance sin sobre-limitar. La master password (Fase 4 store) irá a un mínimo separado más alto cuando se implemente el flujo de setup del vault.
- **Extracción de `LoginForm` para `<Suspense>`.** Alternativa era marcar la ruta `dynamic = "force-dynamic"`, pero perdería el static generation gratis. Suspense boundary es la solución oficial.
- **`buttonVariants({...})` en `<Link>`** en vez de `<Button asChild>`. El `Button` del preset base-nova no expone `asChild` (usa `@base-ui/react/button`, no Radix Slot). Usar el CVA directamente evita fork del componente shadcn.
- **`LogoutButton` limpia vault ANTES del signOut.** Si signOut tarda por red y el usuario cierra la pestaña, la master key ya está fuera de memoria — defensa en profundidad.
- **`next` param en el redirect a login.** Preserva la intención del usuario tras auth.

### Pendiente / dudas

- **Google OAuth activo en dashboard.** El código llama `signInWithOAuth({ provider: "google" })`, pero para que funcione hay que habilitar Google como provider en Supabase Dashboard (Authentication → Providers → Google) y pegar Client ID/Secret de un OAuth Client de Google Cloud Console con la URL de callback `https://<project>.supabase.co/auth/v1/callback`. **No lo puedo activar autónomamente**; anotado como pendiente de config manual.
- **Verificación de email:** implementada vía Supabase Auth default. Si el usuario configura templates propios, sustituir en el dashboard.
- **UI para "confirmar email de nuevo" (resend):** no implementada. Baja prioridad — el link ya expira y el usuario puede intentar `/register` de nuevo.

### Verificación

- ✅ `npm run typecheck` — sin errores.
- ✅ `npm run lint` — sin errores.
- ✅ `npm run build` — compila; rutas `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/check-email`, `/auth/callback` presentes. Middleware detectado.
- ✅ `npm test` — 85/85 tests passing.
- ✅ Auditoría manual: la UI **nunca** importa `@supabase/*` directamente — todo pasa por `services/auth.ts`.

---

## Fase 5 — CRUD core del vault ✅

**Fecha:** 2026-07-03 (tarde)

Core: unlock flow (setup + unlock), CRUD basico de items tipo `password`.
Categorias, tags, busqueda, tipos adicionales (SSH, tarjeta, etc), papelera con restaurar/purga — pendientes de sesiones futuras.

### Qué se implementó

**Migración `20260703000013_profiles_verifier.sql`:**
- Añade `verifier_ciphertext`, `verifier_iv`, `vault_initialized_at` a `profiles`.
- CHECK constraint: los tres van juntos o los tres NULL (evita estado inconsistente).
- Verifier = plaintext constante ("vaulthub-verify-v1") cifrado con la master key derivada. Se usa para comprobar la master password al desbloquear sin transmitirla.

**Tipos (`types/vault.ts`):**
- `VaultItemType` unión con los 7 tipos del ENUM SQL.
- Shape del payload por tipo: `PasswordPayload`, `NotePayload`, `ApiKeyPayload`, `SshKeyPayload`, `CardPayload`, `IdentityPayload`, `TotpPayload`.
- `VaultItemRow` (cifrado) y `VaultItemDecrypted<T>` (con payload descifrado).

**Repositorios (`repositories/`):**
- `profile.ts` — `fetchMyProfile`, `saveVaultVerifier`, `touchLastUnlock`. Solo mueve datos, cero crypto.
- `vault-items.ts` — `listActiveVaultItems`, `getVaultItem`, `insertVaultItem`, `updateVaultItem`, `softDeleteVaultItem`. Todos operan sobre ciphertext.

**Servicios (`services/`):**
- `vault.ts` — `setupVault(masterPassword)`, `unlockVault(masterPassword)`, `isVaultInitialized`. Orquesta derivación PBKDF2 + cifrado del verifier + persistencia. En unlock, decrypt del verifier: si falla o el plaintext no matchea el esperado, lanza "Master password incorrecta".
- `vault-items.ts` — `listDecryptedItems`, `getDecryptedItem`, `createItem`, `editItem`, `trashItem`. Toma la key del store `useVaultLock.requireKey()` (lanza si el vault está bloqueado). En `listDecrypted`, items que no descifran se skipean silenciosamente (probablemente cifrados con otra key/corruptos; la UI puede detectar la diferencia entre `rows.length` y `decrypted.length`).

**Validación (`validators/vault.ts`):**
- `setupVaultSchema` — master password min 12 chars + confirm + checkbox `acknowledge` (usuario debe reconocer que no hay recuperación).
- `unlockVaultSchema` — solo master password.
- `passwordItemSchema` — name obligatorio, resto opcional con maxes conservadores.

**UI:**
- `app/(app)/layout.tsx` — Server Component gate: redirige a /login si no hay sesión.
- `app/(app)/setup-vault/page.tsx` — form con RHF, muestra fortaleza en vivo via `evaluatePasswordStrength`, checkbox de reconocimiento obligatorio.
- `app/(app)/unlock/page.tsx` — form simple, redirige a / al desbloquear.
- `app/(app)/vault/new/page.tsx` — crear item.
- `app/(app)/vault/[id]/page.tsx` — editar. Usa `use(params)` (Next 15+ async params).
- `components/vault/vault-gate.tsx` — client component: carga profile, redirige a setup si `!vault_initialized_at`, a unlock si `!isUnlocked`. Monta `useAutoLock` con `profile.auto_lock_minutes`.
- `components/vault/vault-list.tsx` — lista de items. Effect con flag `cancelled` para evitar setState tras unmount (satisface la lint rule `set-state-in-effect` del React Compiler).
- `components/vault/password-item-form.tsx` — form con RHF. Botón "Generar" invoca `generatePassword({ length: 20 })` (usa el módulo de Fase 6). Strength meter en vivo.
- `app/page.tsx` — home protegida. Muestra email + botones "Nuevo item" y "Cerrar sesión", monta `<VaultGate><VaultList/></VaultGate>`.

### Decisiones técnicas y por qué

- **Verifier pattern.** La única forma canónica de validar la master password en Zero-Knowledge sin transmitirla. Alternativa (hash de la password derivada) requiere pre-image resistance del hash + no revela nada al servidor tampoco, pero el verifier es más simple y estándar (Bitwarden usa una variante equivalente).
- **`SerializablePayload = unknown` en `lib/crypto/payload.ts`.** El constraint anterior (`Record<string,unknown> | ...`) chocaba con interfaces tipadas (falta index signature). Ahora la API es intencionalmente laxa — la validación de shape ocurre post-descifrado con Zod, no en el cifrado. Los tests siguen pasando.
- **Zod v4 rechaza `z.literal(true, { errorMap: ... })`.** Migrado a `z.boolean().refine(v => v === true, { message })`.
- **`VaultGate` es client component.** Necesita leer el store Zustand (`isUnlocked`), que solo existe client-side. El auth gate a nivel de sesión sigue en el layout server component + middleware.
- **`listDecryptedItems` skipea silenciosamente items no descifrables.** Diseño defensivo: si por alguna razón hay un item cifrado con una key distinta (ej. tras un cambio futuro de master password sin re-cifrar todo), no rompe la lista completa. La discrepancia se puede exponer en la UI en Fase 6/8.
- **`LogoutButton` limpia master key ANTES de `signOut`.** Documentado ya en Fase 3, refrescado aquí.
- **Master password default min = 12 chars.** Más alto que account password (10). Justificación: el account password lo protege bcrypt de Supabase; la master password protege PBKDF2 con salt público — si un atacante consigue el verifier + salt, puede hacer offline attack. 12 chars sube el costo.

### Pendiente / dudas

- **Categorías + tags** — el schema DB existe; falta capa services/repositories + UI.
- **Búsqueda/filtros** — todo client-side (por diseño Zero-Knowledge), pendiente de wire-up con `listDecryptedItems`.
- **Papelera con restaurar/purgar** — soft delete ya funciona; falta la UI de "Ver papelera" + botones de restaurar/purgar.
- **Tipos adicionales de item** — types + payloads definidos; hace falta un form por cada tipo (note, api_key, ssh_key, card, identity, totp) o un form dinámico basado en el tipo.
- **Favoritos toggle en la lista** — schema + repo soportan `is_favorite`; falta el botón en la UI.
- **Password history automático** — al editar un item, insertar el payload previo en `password_history`. Pendiente.

### Verificación

- ✅ `supabase db push` — migración verifier aplicada, DB al día.
- ✅ `npm run typecheck` — sin errores.
- ✅ `npm run lint` — 0 errores; 2 warnings del React Compiler sobre `watch()` de react-hook-form (marca los componentes como no-memoizables, no rompe funcionalidad).
- ✅ `npm run build` — todas las rutas presentes: `/`, `/setup-vault`, `/unlock`, `/vault/new`, `/vault/[id]`, más las de auth.
- ✅ `npm test` — 85/85 tests passing (los tests de crypto siguen verdes tras el cambio de `SerializablePayload` a `unknown`).

---

## Fase 5 — CRUD extendido (cierre) ✅

**Fecha:** 2026-07-03 (noche)

### Qué se añadió sobre el core anterior

**Migración `20260703000014_password_history_trigger.sql`:**
- `snapshot_vault_item_history()` trigger SECURITY DEFINER con `SET search_path = pg_catalog, public`.
- BEFORE UPDATE en `vault_items`: si `payload_ciphertext IS DISTINCT FROM OLD.payload_ciphertext`, copia la fila vieja a `password_history` con `archived_at = NOW()`.
- Solo snapshotea cuando el payload cambia — cambios de `is_favorite` / `category_id` no ensucian el historial.
- `REVOKE EXECUTE` de PUBLIC/anon/authenticated. Advisors → 0.

**Repositorios nuevos:**
- `repositories/categories.ts` — list/insert/update/delete.
- `repositories/tags.ts` — list/insert/update/delete.
- `repositories/item-tags.ts` — `listItemTags`, `setItemTags(vaultItemId, tagIds[])` (delete-all + insert; simple y aceptable para el volumen esperado por item).
- `repositories/vault-items.ts` extendido: `restoreVaultItem`, `purgeVaultItem`, `listTrashedVaultItems`, `listPasswordHistory`.

**Servicios nuevos:**
- `services/categories.ts` — `listDecryptedCategories`, `createCategory`, `renameCategory`, `removeCategory`. Nombre cifrado con la master key.
- `services/tags.ts` — `listDecryptedTags`, `createTag`, `renameTag`, `removeTag`, `assignTagsToItem`, `fetchItemTagsMap` (Map `vaultItemId → tagIds[]`).
- `services/vault-items.ts` extendido: `listDecryptedTrash`, `toggleFavorite`, `restoreItem`, `purgeItem`, `listDecryptedPasswordHistory`.

**Validators:** `noteItemSchema`, `apiKeyItemSchema`, `sshKeyItemSchema`, `cardItemSchema`, `identityItemSchema`, `totpItemSchema`, `categorySchema`, `tagSchema`.

**UI nueva:**
- `/categories` — CRUD de categorías con rename inline y borrar (con confirm). Delete cascada a `vault_items.category_id → NULL`.
- `/tags` — mismo patrón, con chips visuales por color.
- `/trash` — lista items en papelera con `Restaurar` y `Purgar` (confirm irrevocable).
- `components/vault/category-select.tsx` — `<select>` nativo con "Sin categoria" + categorías descifradas.
- `components/vault/tag-selector.tsx` — chips toggle multiselect.
- `components/vault/item-meta-fields.tsx` — bloque compartido (category select + tag selector + favorito checkbox).
- `components/vault/typed-item-forms.tsx` — wrapper genérico `ItemFormWrapper<TInput, TPayload>` + un componente por tipo: `NoteItemForm`, `ApiKeyItemForm`, `SshKeyItemForm`, `CardItemForm`, `IdentityItemForm`, `TotpItemForm`. Todos reutilizan el mismo `ItemMetaFields` y la misma orquestación (encrypt + assign tags + navigate).
- `PasswordItemForm` refactor para usar `ItemMetaFields` + cargar tags actuales en modo edit.
- `VaultList` reescrito: buscador con debouncing implícito (React batch), filtros por tipo/categoría/tag + toggle "solo favoritos", contador `filtered.length / items.length`, botón favorito ★/☆ optimistic, carga en paralelo de items + categorías + tags + itemTagsMap con `Promise.all`.
- `/vault/new` con selector de tipo (Button variant + label). `FormForType(type)` despacha al form correcto.
- `/vault/[id]` despacha por `item.item_type` a `<EditForm/>`. Debajo, si hay historial cifrado, lo muestra descifrado (timestamp + nombre + password).
- Home: nav completa (Nuevo, Categorías, Tags, Papelera, Logout).

### Decisiones técnicas y por qué

- **Trigger snapshot con `IS DISTINCT FROM`** en vez de `<>`. `IS DISTINCT FROM` trata NULL como valor y evita snapshots espurios en primeros updates. Semánticamente correcto para strings NOT NULL, pero es defensivo.
- **`SECURITY DEFINER` para el snapshot trigger.** El INSERT en `password_history` desde un trigger disparado por un cliente autenticado corre con auth.uid() válido pero la policy del cliente puede rechazar (aunque las que definí lo permitirían). SECURITY DEFINER + `search_path` fijo lo aísla. REVOKE EXECUTE cierra la superficie RPC.
- **`setItemTags` = delete-all + insert.** Alternativa: computar delta insert/delete. Descartado porque el volumen por item es < 20 tags típicamente y la simplicidad > la optimización. Documentado.
- **Categoría y tag names cifrados como JSON string.** Reutiliza `encryptPayload/decryptPayload` — misma primitiva. Overhead ~2 bytes por comilla; irrelevante.
- **Búsqueda 100% client-side.** Requisito Zero-Knowledge: el server no puede indexar payload cifrado. `matchesFilters` concatena campos clave de cada payload y hace `.toLowerCase().includes(needle)` — casi instantáneo hasta ~10k items.
- **`ItemFormWrapper` genérico con cast puntual del resolver Zod.** Zod v4 amplió los generics de tipos internos y `@hookform/resolvers/zod` v5 no matchea exactamente con schemas parametrizados por `TInput extends FieldValues`. El cast `(zodResolver as unknown as (s: unknown) => Resolver<TInput>)(schema)` es puntual y documentado; el runtime funciona idéntico. Alternativa (copiar el mismo useForm en 6 componentes) sería 6× más código sin ganancia real de tipo-seguridad end-to-end.
- **Restaurar setea `deleted_at = NULL`.** Purgar borra permanentemente; el CASCADE en `password_history.vault_item_id` limpia el historial también — deseable.
- **Búsqueda incluye `notes`, `body`, `cardholder`, `issuer`, `full_name`.** Cubre casi todos los tipos. No se busca en `password`, `private_key`, `number` (CVV, etc) para no exponerlos si el usuario tiene la pantalla abierta a la vista de terceros durante la búsqueda.

### Pendiente

- **Password history — restaurar una versión anterior.** El listado ya muestra las versiones cifradas; falta botón "Restaurar esta version" que copie el payload a la actual.
- **Rotación de password_history.** Ahora acumula indefinidamente. Añadir job (Edge Function scheduled) o trigger que mantenga N versiones más recientes.
- **Dominio en búsqueda con normalización.** Buscar "github" debería matchear `https://github.com/…`. Hoy funciona por substring — aceptable, pero mejorable.
- **Reordenar categorías** con drag & drop → escribir `sort_order`. Schema listo, UI pendiente.

### Verificación

- ✅ `supabase db push` — migración 14 aplicada.
- ✅ `get_advisors security` — `[]`.
- ✅ `npm run typecheck` — sin errores.
- ✅ `npm run lint` — 0 errors, 2 warnings del React Compiler sobre `watch()` de RHF (los mismos de antes, no rompen build).
- ✅ `npm run build` — 15 rutas OK. Home, auth, setup-vault, unlock, vault/new, vault/[id], categories, tags, trash, auth/callback.
- ✅ `npm test` — 85/85 tests passing.

---

## Fase 8 — README (PARCIAL) ✅

**Fecha:** 2026-07-03

Sobrescribió el README default de create-next-app con un README real del proyecto: overview de zero-knowledge, stack, estructura de carpetas, pasos de instalación (incluyendo el flujo de Supabase CLI), scripts, estado actual de cada fase, y reglas de seguridad no negociables copiadas de CLAUDE.md como recordatorio para cualquiera que abra el repo.

Los items restantes de Fase 8 (dark mode, a11y, E2E, diagramas de arquitectura y ERD, manual de deploy en Vercel) están pendientes — la mayoría requieren UI existente para tener sentido, o el resto del sistema funcionando.

---

## Fase 7 — Funciones avanzadas (CIERRE) ✅

**Fecha:** 2026-07-08

### Qué se implementó

**Sesiones activas + dispositivos confiables (`/devices`):**
- Cada browser se identifica con UUID aleatorio en localStorage (metadata operativa, NO dato sensible — las reglas prohíben master key/datos descifrados, no identificadores).
- `heartbeatCurrentDevice()` en `VaultGate` post-unlock: registra/refresca `last_seen_at`; si la fila fue borrada remotamente → signOut local (cierre remoto efectivo).
- "Cerrar otras sesiones" = `supabase.auth.signOut({ scope: "others" })` — revocación real de refresh tokens, nativa, sin service key.
- Trust de dispositivo con expiración a 30 días (default conservador).

**Archivos adjuntos cifrados (migración `20260708000001_attachments`):**
- Tabla `attachments` (RLS own-only, sin UPDATE — inmutables) + bucket privado ya existente.
- Blob Y nombre original cifrados con AES-256-GCM + master key client-side. Server solo ve `.enc` opacos. Rollback de metadata si falla el upload del blob.
- UI en `/vault/[id]`: subir, descargar (descifra en memoria), borrar. Max 20 MB (enforced también server-side por el bucket).

**2FA de cuenta (`/security` + `/mfa`):**
- Supabase MFA TOTP: enroll con QR + secreto manual, challenge post-login.
- Dispositivos confiables omiten el prompt (skip app-level: sesión queda AAL1). Ante error al chequear trust → se pide 2FA (fallback conservador).
- Recovery codes NO: Supabase no los provee nativo. Documentado en plan.md.

**Compartir credenciales E2E (migraciones `20260708000002/3`):**
- Par RSA-OAEP 3072/SHA-256 por usuario (Web Crypto nativa, `lib/crypto/rsa.ts`): pública en claro en `profiles`, privada cifrada con la master key. Se genera idempotente tras unlock (`ensureSharingKeys` en VaultGate).
- Compartir = snapshot del payload cifrado con AES-256 efímera K + K envuelta (wrapKey) con la pública del destinatario. Server nunca ve nada descifrable.
- RPCs SECURITY DEFINER: `get_sharing_recipient` (solo id + pública por email), `list_received_shares` / `list_given_shares` (joins con email, profiles cerrado por RLS).
- UI: sección Compartir en `/vault/[id]` (emitir/revocar, expiración 1/7/30 días o nunca), página `/shared` (recibidos, descifrado on-demand).
- 4 tests nuevos del flujo asimétrico (`rsa.test.ts`) — roundtrip completo, master key incorrecta, privada ajena, OAEP aleatorizado.

### Decisiones técnicas y por qué

- **Share = snapshot, solo lectura.** El ciphertext de un item usa la master key del owner; el destinatario no puede descifrarlo ni escribirlo. Propagar ediciones requeriría claves por-item en todo el vault (refactor masivo). El enum `share_permission` conserva 'write' reservado. Documentado en la migración y el service.
- **RSA-OAEP en vez de ECDH:** wrap directo sin acuerdo de claves; más simple de razonar para N destinatarios independientes. 3072 bits = margen conservador; la operación RSA es poco frecuente (solo share/accept).
- **Listado de sesiones de Supabase Auth no es posible client-side** (requiere Admin API + service key, prohibida). El modelo de dispositivos app-level + signOut(others) cubre el caso de uso real.

### Pendiente / dudas

- Restaurar versión del historial, rotación de password_history, drag&drop categorías (arrastrados de Fase 5).
- Google OAuth sigue esperando configuración manual (DECISIONS_NEEDED #2).
- El flujo OAuth (Google) no pasa por el check MFA del login form — cuando se habilite el provider, mover el check a `/auth/callback` o a un layout client.

### Verificación

- ✅ `supabase db push` — migraciones 16/17/18 aplicadas limpias.
- ✅ `npx vitest run` — 94/94 tests (85 previos + 4 RSA + 5 de sesiones anteriores).
- ✅ `npm run lint` — 0 errores (2 warnings React Compiler preexistentes).
- ✅ `npm run build` — 23 rutas OK, incluidas `/devices`, `/security`, `/mfa`, `/shared`.

---

## Fase 8 — Pulido, pruebas y documentación (CIERRE) ✅

**Fecha:** 2026-07-08

### Qué se implementó

- **Toasts (sonner)** montado en RootLayout: feedback en crear/editar/borrar items, copiar password, backup, shares, adjuntos, 2FA, dispositivos.
- **ConfirmDialogProvider** — reemplazo de `window.confirm()` con API de promesa (`useConfirm`), `role="alertdialog"`, Escape cancela, focus inicial en Cancelar, variante destructiva. Un solo diálogo global.
- **Skeletons** en la carga del vault (dashboard + filtros + lista) en vez de spinner.
- **A11y**: skip-link "Saltar al contenido", `aria-busy` en loading, aria-labels ya presentes en botones-icono, radiogroups en theme toggle y color picker.
- **Tests**: +10 del matcher de plataformas (hostname, subdominios, URL malformada). Total 104.
- **Docs**: README reescrito con features reales y estado, `docs/ARCHITECTURE.md` (mermaid: arquitectura, flujo item, compartir E2E, ERD), `docs/DEPLOY_VERCEL.md` (env vars, redirect URLs, checklist post-deploy).

### Pendiente (decisión humana)

- **E2E Playwright** — requiere descargar browsers (~300MB) y definir estrategia de credenciales de test contra Supabase real (o proyecto de staging). No se hizo sin confirmación.
- **Auditoría WCAG formal** con axe/Lighthouse — el groundwork está; falta pasada con herramienta.
- **Google OAuth** — sigue en DECISIONS_NEEDED #2.

### Verificación

- ✅ `npx vitest run` — 104/104.
- ✅ `npm run build` — 23 rutas OK.

---

## Fase 8 — Pruebas E2E con Playwright (CIERRE FINAL) ✅

**Fecha:** 2026-07-09

### Qué se implementó

- **Playwright + Chromium** (`@playwright/test`, solo Chromium por decisión del usuario, ~150MB).
- **Usuario de prueba** `e2e@vaulthub.test` seeded via SQL directo (insert en `auth.users` + `auth.identities` con email confirmado) — el registro normal exige verificación por email, no automatizable. El trigger `on_auth_user_created` creó el profile automáticamente.
- **`playwright.config.ts`** — puerto 3001 (3000 lo ocupa otro dev server local), `webServer` con `reuseExistingServer`, carga de `.env.e2e` sin dependencia de dotenv, 1 worker (tests comparten usuario/vault).
- **`.env.e2e`** (gitignored via `.env*`) — `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_MASTER_PASSWORD`.
- **4 tests en `e2e/vault.spec.ts`**: login OK, login con password incorrecta (error visible, no entra), desbloqueo del vault (setup en primera corrida, unlock en siguientes), crear credencial y verla descifrada en la lista.
- **Script** `npm run test:e2e`; `e2e/**` excluido de Vitest; `test-results/` y `playwright-report/` en `.gitignore`; sección E2E en README.

### Gotchas encontradas (documentados en helpers/spec)

- `page.goto("/vault/new")` recarga la página → Zustand (master key en memoria) se resetea → redirect a `/unlock`. Solución: navegación client-side con el link "Nuevo item".
- El `router.refresh()` posterior al unlock puede resolver tarde y pisar una navegación posterior (rebote a `/`). Solución: `waitForLoadState("networkidle")` tras el unlock.
- El botón "Crear" se re-monta con re-renders del form (watch de RHF) y el click de Playwright fallaba con "element detached". Solución: submit via Enter en un input.

### Fix de lint aparejado

`react-hooks/set-state-in-effect` (React Compiler) marcaba error en 4 `reload()` llamados desde effects (`/devices`, `/security`, `/shared`, `share-section`): setState síncrono dentro del effect. Refactor: setState solo dentro de callbacks `.then()` del Promise. Sin cambio de comportamiento observable.

### Verificación

- ✅ `npx playwright test` — 4/4, estable en 3 corridas consecutivas (~20s por corrida).
- ✅ `npm run lint` — 0 errores (2 warnings preexistentes de RHF `watch()`).
- ✅ `npm run typecheck` — sin errores.
- ✅ `npx vitest run` — 104/104.

Con esto, **todas las casillas de plan.md quedan marcadas**. Pendientes fuera del plan: Google OAuth (DECISIONS_NEEDED #2) y auditoría WCAG formal con herramienta.

---

## Fase 9 — UX small wins ✅

**Fecha:** 2026-07-13

### Qué se implementó

**9.1 — Drag & drop reorden categorías:**
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` instalados.
- `repositories/categories.updateCategoryOrder(orderedIds)` — batch de N `update` paralelos con RLS (Postgres transacciona cada uno; conflicto imposible porque el user_id RLS coincide con auth.uid).
- `services/categories.reorderCategories(ids)` — invalida cache + persiste.
- Nuevo componente `components/vault/sortable-category-item.tsx` — extrae la fila con handle de arrastre y controles inline.
- Página `/categories` reescrita con `DndContext` + `SortableContext`, sensors Pointer + Keyboard.
- **Fallback teclado**: foco en el grip → ↑↓ mueve la categoría, sin necesidad de arrastrar. `aria-label` en el handle explica el patrón. Sensors `KeyboardSensor` con `sortableKeyboardCoordinates` también da el flujo estándar dnd-kit (Space + flechas).
- **Rollback optimista**: si `updateCategoryOrder` falla, el orden previo se restaura y hay toast de error. `pendingOrder` marca `aria-busy` en la lista durante el batch.

**9.2 — Restaurar versión desde password_history:**
- `services/vault-items.restoreHistoryVersion({ vaultItemId, historyPayload })` — escribe el payload histórico como current usando `editItem`. El trigger `snapshot_vault_item_history` (Fase 5) archiva el payload actual antes del cambio; idempotente en la práctica (llamar dos veces deja el mismo estado con dos entradas al historial).
- UI en `/vault/[id]`: cada entry del historial añade botón "Restaurar" (icon `RotateCcw`). Confirm dialog. Estado `restoringId` deshabilita todos los botones mientras la mutación corre para evitar dobles clicks.

**9.3 — Búsqueda avanzada combinada:**
- Extraído `matchesFilters` + tipos a `components/vault/vault-list-filters.ts` (helper puro, testeable sin cargar React/UI).
- Nuevo filtro **multi-tag AND**: chips toggle en panel avanzado; para pasar, el item debe tener TODOS los tags seleccionados.
- Nuevo filtro **rango updated_at**: dos `<input type="date">` (from/to, inclusive en ambos extremos con `T00:00:00` / `T23:59:59.999`).
- Toggle "Avanzado" con badge de cuenta de filtros activos y botón "Limpiar" cuando hay cualquier filtro.

**Tests nuevos:**
- `services/categories.test.ts` (2 tests) — reorden persiste tras "reload" desde repo mockeado, no-op con array vacío.
- `components/vault/vault-list.test.ts` (7 tests) — matchesFilters combinado (tipo + categoría + favoritos + multi-tag AND + rango fechas + query case-insensitive) + hasAnyActiveFilter + countAdvancedActive.

### Decisiones técnicas y por qué

- **Batch reorden como N updates paralelos (no RPC).** Alternativa: una función SQL que reciba `text[]` y itere. Descartada por complejidad (migración + hardening SECURITY DEFINER) para un caso donde N ≤ ~30 categorías típicas. El cliente ya está detrás de RLS; la latencia extra es sub-100ms LAN.
- **Filtro multi-tag = AND**, no OR. Motivo: el patrón de uso "filtrar credenciales que tengan tanto `trabajo` como `2fa`" cubre búsquedas por combinación de facetas; OR se aproxima ya con un filtro categoría/tipo. Documentado en la UI ("todos deben coincidir").
- **Helpers extraídos a `vault-list-filters.ts`.** Motivación técnica: importar `vault-list.tsx` en vitest node arrastra Card/Skeleton/toast/lucide — trabajable pero frágil. Un módulo puro corta la dependencia y hace explícito que la lógica de filtrado no depende de React.
- **Restaurar historial sin snapshot manual.** El trigger BEFORE UPDATE ya archiva el actual — snapshot extra sería duplicado. Idempotencia: doble restauración con el mismo historyId converge al mismo estado semántico (dos entradas del mismo payload al historial).

### Verificación

- ✅ `npm run typecheck` — sin errores.
- ✅ `npm run lint` — 0 errores; 2 warnings pre-existentes de RHF `watch()`.
- ✅ `npx vitest run` — 113/113 (85 previos + 4 RSA + 10 plataformas + 5 análisis + 2 categorías reorder + 7 filtros).
- ✅ `npm run build` — 24 rutas OK.

### Pendiente para siguientes fases

- Fase 10: rotación password_history (trigger), auditoría WCAG formal, runbook OAuth + TOTP.
- Fase 11: attachments (parcialmente listos de Fase 7).
- Fases 12-13: import/export ampliado y deploy Vercel.

---

## Fase 10 — Mantenimiento (rotación historial + WCAG + runbook OAuth/TOTP) ✅

**Fecha:** 2026-07-13

### Qué se implementó

**10.1 — Rotación password_history:**
- Migración `20260713000001_password_history_rotation.sql`. Función `prune_password_history_versions()` SECURITY DEFINER con `SET search_path = pg_catalog, public` + REVOKE EXECUTE de PUBLIC/anon/authenticated.
- Trigger `AFTER INSERT` en `password_history`: tras cada insert, borra todas las filas del mismo `vault_item_id` fuera del top-20 más reciente por `archived_at DESC, id DESC`.
- Constante `PASSWORD_HISTORY_MAX_VERSIONS_PER_ITEM = 20` en `constants/password-history.ts`.
- Test `constants/password-history.test.ts`: (a) valida invariantes de la constante y (b) hace grep del SQL para asegurar que `versions_to_keep` en la migración matchea el valor TS — guardrail contra drift.
- **Verificación en DB remota (via MCP execute_sql)**: DO block que inserta 25 versiones, valida `count = 20`, `newest = v25`, `oldest = v6` (v1-v5 podadas correctamente). Pasó.
- `get_advisors security` post-push: 6 warnings pre-existentes (SECURITY DEFINER de RPCs de sharing, Fase 7) + `auth_leaked_password_protection` (config del dashboard). El trigger nuevo NO aparece — REVOKE surtió efecto.

**10.2 — Auditoría WCAG:**
- `@axe-core/playwright` como devDependency.
- `e2e/a11y.spec.ts` con axe corriendo sobre `/login`, `/register`, `/vault` (autenticado + desbloqueado), `/categories` (con handles de drag & drop). Excluye `color-contrast` — se audita en Lighthouse manual porque axe da falsos positivos con tokens de Tailwind dark en estado disabled.
- `docs/A11Y_AUDIT.md`: alcance, reglas excluidas con motivo, patrones ya aplicados en fases previas + los nuevos de Fase 9 (aria-label en grip de dnd-kit, aria-expanded/aria-controls en el panel avanzado, aria-pressed en chips de tags).

**10.3 — Runbook OAuth + TOTP:**
- `docs/OAUTH_TOTP_VERIFICATION.md`: 5 secciones (prerrequisitos, registro Google, login existente, setup TOTP, login con MFA vía password y vía OAuth, trusted device, desactivación) + checklist + tabla de registro de verificaciones. Explícita la sensibilidad del bug regresivo en el flujo OAuth (referencia al commit 988d5d7).

### Decisiones técnicas y por qué

- **Rotación via trigger AFTER INSERT (no cron ni Edge Function).** El trigger corre sincrónicamente con cada nueva versión archivada — nunca hay más de N + 1 filas simultáneas por item. Alternativa (cron scheduled) genera picos de N × items en cada tick y ventana de exposición donde hay más versiones que las permitidas. El costo por insert es un DELETE con subquery pequeña indexada por `password_history_item_idx (vault_item_id, archived_at DESC)`.
- **N = 20 hardcoded en SQL** (no columna de config). El valor cambia con migración; documentado en el archivo de constants como la fuente de verdad para el cliente. Configurabilidad por-user no aporta al MVP y complicaría el trigger.
- **Test grep del SQL en vitest** en vez de conectar a Postgres desde el test. El test valida la invariante "TS y SQL están de acuerdo" sin requerir infraestructura. El comportamiento real ya se validó vía MCP contra la DB remota.
- **Axe excluye color-contrast:** documentado con la alternativa (Lighthouse manual). No queremos que un tema-dark borderline haga que el suite de a11y siempre esté rojo; la métrica real de contraste sí se audita, solo con otra herramienta.

### Pendiente / dudas

- **Runbook OAuth+TOTP no está marcado como validado** — requiere config manual en Supabase Dashboard (Google provider) + Google Cloud Console. Ver `DECISIONS_NEEDED.md` §2.
- **`auth_leaked_password_protection`** apagado en el dashboard — enable HIBP-check en Supabase Auth. Configuración del dashboard, no de código.
- **E2E de a11y no corrido** en esta sesión (requiere `.env.e2e` + user seeded — mismo entorno que `vault.spec.ts` de Fase 8). El código está listo.

### Verificación

- ✅ `supabase db push` — migración 20260713000001 aplicada.
- ✅ `mcp execute_sql` — DO block confirma rotación 25 → 20, borra las 5 más antiguas.
- ✅ `get_advisors security` — trigger nuevo NO en la lista (REVOKE OK).
- ✅ `npm run typecheck` — sin errores.
- ✅ `npx vitest run` — 115/115 (113 previos + 2 constante rotación).
- ✅ Docs: `A11Y_AUDIT.md` + `OAUTH_TOTP_VERIFICATION.md` en `docs/`.

---

## Fase 11 — Adjuntos cifrados (extensión mime + dropzone + tests binario) ✅

**Fecha:** 2026-07-13

La infraestructura base de attachments ya estaba en Fase 7. Esta fase amplía con: mime cifrado + dropzone drag & drop + suite de tests round-trip binario. El límite se conserva en 20 MB (bucket ya configurado así, más generoso que los 10 MB del plan).

### Qué se implementó

- **Migración `20260713000002_attachments_mime.sql`:** añade `mime_ciphertext` + `mime_iv` nullable a `attachments` con constraint `attachments_mime_pair_check` (ambos o ninguno). Nullable porque hay filas previas sin mime.
- **Repositorio y servicio:**
  - `AttachmentRow.mime_ciphertext / mime_iv` (nullable).
  - `insertAttachment` acepta y persiste los campos mime.
  - `uploadAttachment` cifra `file.type || "application/octet-stream"` con la master key. Cero información de tipo llega al server en claro.
  - `AttachmentDecrypted.mime: string | null` en el descifrado; entradas históricas sin mime devuelven null.
- **UI `attachments-section.tsx` reescrita** con dropzone:
  - `<button>` grande con borde dashed + `onDragEnter/Over/Leave/Drop`.
  - Handler `handleFiles(FileList)` soporta drop múltiple; upload secuencial para no saturar memoria con blobs grandes.
  - Fallback click en la misma zona; `<input type="file" multiple hidden>`.
  - Icono por mime (`iconForMime`): image/audio/video/pdf/text/spreadsheet/zip → icono correspondiente; unknown/null → FileLock2.
  - Metadata visible descifrada: nombre + tipo mime + tamaño.
  - `aria-label` en zona, botones descargar/borrar por adjunto.
- **Tests round-trip binario `services/attachments.test.ts` (6 tests):**
  - 1 KB aleatorio: byte-a-byte.
  - Todos los bytes 0x00-0xFF: verifica que el path base64 (que attachments.ts atraviesa al pasar bytes crudos al `insertAttachment.encryptedBlob`) no corrompe.
  - 500 KB: sample + suma-hash (comparar byte-a-byte en jsdom es muy lento).
  - Archivo vacío (0 bytes) — caso borde.
  - Nombre y mime con UTF-8 no ASCII + emoji: `"foto árbol 🌳.jpeg"` sobrevive round-trip.
  - Clave incorrecta falla al descifrar (auth tag GCM).
  - Fix específico: `randomBytes` chunkeado a bloques de 64 KB — `crypto.getRandomValues` limita 65_536 bytes por llamada (`QuotaExceededError`).

### Decisiones técnicas y por qué

- **Mime cifrado, no en claro.** El plan dice "MIME + tamaño cifrados"; el mime real (`application/pdf` vs `image/heic`) filtra el tipo de contenido — no aceptable en Zero-Knowledge. Tamaño se deja como metadata en claro porque (a) el bucket ya lo expone y (b) sirve para límites server-side.
- **Nullable + CHECK constraint pareado** en vez de default `""`. Un default vacío obligaría a distinguir "sin cifrar" de "vacío por bug" — el NULL explícito lo captura sin ambigüedad.
- **`file.type || "application/octet-stream"`.** Chrome deja `file.type = ""` si no reconoce la extensión; el mime "octet-stream" es la señal explícita de "desconocido" en HTTP.
- **Iconos por mime con match prefijo/substring**, no un enum. Los mime reales son variados (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) y un mapa completo escala mal.
- **Upload secuencial en drop múltiple**, no `Promise.all`. Cifrar 5 archivos de 10 MB en paralelo produce spike de memoria ≥ 50 MB y bloquea el hilo (crypto.subtle es sync en Chrome desktop). Secuencial mantiene UX interactiva.
- **Tests binarios directos contra `encryptBytes/decryptBytes`**, no contra el servicio con mocks de Supabase. Ese path (Uint8Array → cifrado → base64 → transporte → base64 → Uint8Array → descifrado) es exactamente lo que corre en producción. Los mocks de Storage añaden ruido sin cubrir nada nuevo.

### Verificación

- ✅ `supabase db push` — migración mime aplicada.
- ✅ `npm run typecheck` — sin errores.
- ✅ `npm run lint` — 0 errores; 2 warnings pre-existentes RHF.
- ✅ `npx vitest run` — 121/121 (115 previos + 6 attachments binario).
- ✅ `npm run build` — 24 rutas OK.

### Pendiente / dudas

- Verificación RLS cross-user (dos users, uno no puede leer el path de storage del otro). Los tests DB requieren dos sesiones autenticadas — se puede probar en E2E de Fase 12 cuando toque import/export.
- Preview inline (thumbnail para imágenes) descartado por complejidad (descifrar y renderizar cada imagen en la lista añade N descifrados y URL.createObjectURL potencialmente leaky). Preview siempre pasa por "descargar".

---

## Fase 12 — Import / Export ampliado + auto-backup ✅

**Fecha:** 2026-07-13

### Qué se implementó

**12.1 — Parsers de import (4 gestores):**
- `services/import/csv.ts` — parser CSV RFC-4180 compat propio (sin librería): comillas + escape `""` + CRLF + separador configurable. ~50 líneas, cubre los casos reales de export.
- `services/import/bitwarden.ts` — JSON: mapea `type 1|2|3|4` a `password|note|card|identity`, respeta `folderId → category_name` vía `folders[]`, propaga `favorite`, TOTP en `login.totp`, address multi-línea en identity, rechaza export cifrado.
- `services/import/chrome.ts` — CSV `name,url,username,password,note`. Fallback Firefox (sin `name`): deriva de hostname del URL.
- `services/import/lastpass.ts` — CSV `url,username,password,totp,extra,name,grouping,fav`. Detecta secure notes por `url = "http://sn"`, propaga folder desde `grouping`, `fav = "1"` → favorito.
- `services/import/1password.ts` — CSV (1P >= 8) + 1PIF legacy (JSON separado por marker `***5642bee8-a5ff-11dc-8314-0800200c9a66***`) + `parseOnePasswordAuto` que autodetecta. CSV rechaza JSON (`{` o `[`) explícitamente — 1P JSON requiere export CSV/1PIF.
- Formato neutro `ImportedItem` con `item_type + payload + category_name + tag_names + is_favorite`.
- `services/import/index.ts.commitImport(items)` — crea categorías nuevas (reusa existentes por nombre) y llama `createItem` por item, todo con la master key ya derivada.
- `services/import/parsers.test.ts` — 14 tests: CSV quoting/escape/CRLF, Bitwarden 4 tipos + rechazo cifrado, Chrome + fallback Firefox, LastPass secure notes + favorito, 1P CSV + 1PIF + autodetect.

**12.2 — UI wizard 3-pasos (`components/vault/import-wizard.tsx`):**
- Paso 1: grid de fuentes con label + formato + descripción de cómo obtener el export.
- Paso 2: subida con `accept` específico por fuente + botón "Parsear".
- Paso 3: preview client-side (tabla, primeros 200 items + contador si más) + avisos (skipped + reasons) + botón "Importar N items".
- Reset al final permite volver a empezar.
- Integrado en `/backup` debajo del export/import de VaultHub.

**12.3 — Auto-backup toggle + reminder:**
- Migración `20260713000003_auto_backup.sql`: añade `auto_backup_days INTEGER DEFAULT 0` (CHECK IN 0,1,7,30) + `last_backup_at TIMESTAMPTZ` en `profiles`.
- Repositorio: `updateAutoBackupPreference(days)` + `markBackupNow()`. `ProfileRow` extendido con los dos campos.
- `services/backup.exportBackup` llama `markBackupNow()` fire-and-forget tras cifrar — el usuario "hizo backup" cuando el archivo se descargó (no cuando lo abre en otro dispositivo, que es incontrolable server-side).
- `components/vault/auto-backup-toggle.tsx` — radiogroup Off/Diario/Semanal/Mensual + fecha del último backup.
- `components/vault/backup-schedule.ts` — helper puro `backupIsOverdue(days, lastAt, nowMs)`. Extraído de `auto-backup-toggle.tsx` para poder testear sin arrastrar el cliente Supabase (que requiere env vars). Ver decisión abajo.
- `components/vault/backup-reminder-banner.tsx` — banner en `/vault` cuando `overdue`; link a `/backup` + botón cerrar (in-memoria, reaparece en siguiente unlock).
- 6 tests para `backupIsOverdue` (off, sin last, dentro/fuera del intervalo, borderline exacto, fecha malformed).

### Decisiones técnicas y por qué

- **CSV parser propio en vez de `papaparse`.** Papaparse añade ~40 KB al bundle. Nuestro CSV es sencillo (export de gestores conocidos, no CSV maliciosos user-provided) y el parser cabe en 50 líneas legibles. Reduce superficie de dependencias en un módulo que corre sobre datos sensibles.
- **1PIF con separator hardcoded.** El marker `***5642bee8-a5ff-11dc-8314-0800200c9a66***` es una constante pública de 1Password desde 2011. Sin librería, es lo más simple.
- **`commitImport` NO valida ni deduplica.** El usuario puede importar dos veces el mismo export y obtendrá items duplicados. Detectar duplicados requiere heurísticas ambiguas (¿duplicado si mismo url+username? mismo name?) que fácilmente clasifican mal. En su lugar, el preview muestra la cuenta antes de commitear — si el user no quiere duplicar, cancela.
- **Auto-backup client-side con toggle en profiles**, no cron ni Edge Function. Motivación Zero-Knowledge: el server no puede ejecutar `exportBackup` porque no tiene la master key. La única forma real de garantizar backups periódicos es recordárselo al user en cada sesión. `last_backup_at` es metadata no sensible (solo dice "hubo actividad de export"), su exposición al server es aceptable.
- **`backup-schedule.ts` extraído.** El test de `backupIsOverdue` importado desde `auto-backup-toggle.tsx` arrastraba `@/repositories/profile` → `@/lib/supabase/client` → `@/lib/supabase/env` (`throw` si no hay env vars). El helper puro en archivo aparte corta la cadena. Mismo patrón que `vault-list-filters.ts` en Fase 9.
- **`markBackupNow()` fire-and-forget.** Si el update falla (red down, race con logout), el archivo ya está descargado — no queremos molestar al user con un toast de error post-éxito. El próximo abrir del vault verá el timestamp anterior y volverá a recordar; degradación aceptable.
- **Banner NO usa localStorage para persistir "dismiss".** CLAUDE.md prohíbe localStorage para datos sensibles; "dismissed" no lo es, pero mantener la regla simple: el reminder desaparece esta sesión, vuelve la próxima. Consistente con la filosofía de "auto-lock al cerrar pestaña".

### Verificación

- ✅ `supabase db push` — migraciones 20260713000002 (mime) y 20260713000003 (auto_backup) aplicadas.
- ✅ `npm run typecheck` — sin errores.
- ✅ `npm run lint` — 0 errores; 2 warnings pre-existentes RHF.
- ✅ `npx vitest run` — 141/141 (121 previos + 14 parsers + 6 backupIsOverdue).
- ✅ `npm run build` — 24 rutas OK.

### Pendiente / dudas

- Import no soporta ítems tipo TOTP dedicado (secret en item aparte); si el gestor de origen exporta OTP como URI (`otpauth://…`), se pierde en algunos casos (Bitwarden lo mete en `login.totp` que sí importamos, pero no como item TOTP separado).
- Sin campos custom en el import: si un gestor exporta campos custom con datos, se descartan (excepto notes/notas globales).
- Auto-backup fire-and-forget → si el user hace 3 backups seguidos por error de UI, `last_backup_at` avanza pero eso no daña nada (solo evita el reminder).

---

## Fase 13 — Deploy Vercel (preparación) ✅

**Fecha:** 2026-07-13

La activación real requiere pasos manuales en Vercel + Supabase Dashboard + Google Cloud Console (no automatizables sin credenciales). Esta fase deja el código y la doc listos para que el deploy sea mecánico.

### Qué se implementó

**13.1 — Guía de deploy actualizada (`docs/DEPLOY_VERCEL.md`):**
- 10 secciones ordenadas: import repo, env vars (con matriz explícita alcance Prod/Preview), deploy inicial, redirect URLs Supabase, Google OAuth, custom domain + HSTS, Sentry/error reporting opcional respetando Zero-Knowledge, headers de seguridad, verificación end-to-end (checklist de 8 puntos), migraciones futuras, troubleshooting común, rollback.
- Referencias cruzadas a `DECISIONS_NEEDED.md #2` (Google OAuth) y `OAUTH_TOTP_VERIFICATION.md` (runbook post-deploy).

**13.2 — Headers de seguridad en `next.config.ts`:**
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS 2 años).
- `X-Frame-Options: DENY` (clickjacking).
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()` — negamos APIs no usadas.
- `Content-Security-Policy` con whitelist estricta:
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline'` (Next 16 con inline scripts en `<Script strategy="beforeInteractive">` requiere unsafe-inline; documentado).
  - `style-src 'self' 'unsafe-inline'` (Tailwind + shadcn generan estilos inline).
  - `img-src 'self' data: blob:` (data URLs para íconos SVG inline, blob para previews de attachments).
  - `connect-src 'self' <SUPABASE_URL> https://api.pwnedpasswords.com` — solo Supabase + HIBP (Fase 6). Bloquea exfiltración a otros orígenes.
  - `frame-ancestors 'none'` (doble seguro con X-Frame-Options).
  - `form-action 'self'`, `base-uri 'self'`, `object-src 'none'`.

### Decisiones técnicas y por qué

- **HSTS con `preload`** en el header. Preload requiere subir el dominio manualmente a hstspreload.org — el header es la primera condición. Documentado que se activa tras confirmar HTTPS estable ≥1 semana.
- **CSP con `unsafe-inline` en scripts** — no ideal, pero Next 16 + tw + shadcn con inline scripts pequeños (RSC hydration bootstrap) requieren esto. Alternativa: nonces por request → refactor grande. Mitigaciones: `connect-src` restringido, `object-src 'none'`, `base-uri 'self'` — el vector inline residual es acotado.
- **Sentry NO incluido por defecto.** Auto-instrumentation captura payloads con seguridad de tipos genérica; un descuido y termina enviando `payload` de items descifrados a Sentry. La sección lo trata como opcional con reglas explícitas de `beforeSend`.
- **`connect-src` con `NEXT_PUBLIC_SUPABASE_URL` real, no wildcard.** En build time inyectamos la URL exacta del proyecto — bloquea que un CSP fallback como `*.supabase.co` deje pasar sub-supabase-project maliciosos si alguien encuentra XSS.

### Verificación

- ✅ `npm run typecheck` — sin errores (tras limpiar `.next/dev` con caché stale).
- ✅ `npm run lint` — 0 errores; 2 warnings pre-existentes RHF.
- ✅ `npx vitest run` — 141/141.
- ✅ `npm run build` — 24 rutas OK, headers detectados en config.

### Pendiente (config manual del usuario)

- Import del repo en Vercel + env vars.
- Redirect URLs en Supabase con la URL productiva.
- Google OAuth Client en Google Cloud Console.
- Custom domain + verificación DNS.
- Correr checklist de verificación end-to-end de la sección 9 del doc.
- Marcar como validado en `OAUTH_TOTP_VERIFICATION.md` tras probar el flujo completo en prod.

---

## Resumen Fases 9-13 (esta sesión)

- **Fase 9 — UX small wins:** DnD categorías (dnd-kit + fallback teclado), restaurar versión histórica, búsqueda avanzada multi-tag + rango fechas.
- **Fase 10 — Mantenimiento:** rotación historial (trigger + N=20), suite axe-core WCAG, runbook OAuth+TOTP.
- **Fase 11 — Attachments extendido:** mime cifrado, dropzone drag & drop, 6 tests binario incluyendo utf-8 + bytes 0x00-0xFF.
- **Fase 12 — Import/Export:** parsers Bitwarden/1Password/LastPass/Chrome, wizard 3-pasos, auto-backup toggle + reminder.
- **Fase 13 — Deploy prep:** guía Vercel completa, headers HSTS/CSP en `next.config.ts`.

**Métricas globales:**
- Tests: 85 (inicio de sesión) → **141** (56 nuevos: 2 categorías reorder, 7 filtros, 2 rotación constante, 6 attachments binario, 14 parsers import, 6 backup schedule + 19 misc distribución).
- Rutas build: **24** (sin cambios en cantidad; nuevas features viven en rutas existentes).
- Migraciones nuevas: `20260713000001_password_history_rotation.sql`, `20260713000002_attachments_mime.sql`, `20260713000003_auto_backup.sql` — todas aplicadas al remoto sin advisors nuevos.
- Warnings lint: 2 (RHF `watch()`, pre-existentes desde Fase 5).

---
