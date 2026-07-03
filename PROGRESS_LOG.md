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

## Fase 8 — README (PARCIAL) ✅

**Fecha:** 2026-07-03

Sobrescribió el README default de create-next-app con un README real del proyecto: overview de zero-knowledge, stack, estructura de carpetas, pasos de instalación (incluyendo el flujo de Supabase CLI), scripts, estado actual de cada fase, y reglas de seguridad no negociables copiadas de CLAUDE.md como recordatorio para cualquiera que abra el repo.

Los items restantes de Fase 8 (dark mode, a11y, E2E, diagramas de arquitectura y ERD, manual de deploy en Vercel) están pendientes — la mayoría requieren UI existente para tener sentido, o el resto del sistema funcionando.

---
