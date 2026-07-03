# CLAUDE.md — Gestor de Contraseñas Zero-Knowledge

Este archivo contiene las reglas FIJAS del proyecto. Léelo por completo antes de tocar cualquier código, y vuelve a él si tienes dudas durante una sesión autónoma en lugar de detener el trabajo.

## Qué es este proyecto

Gestor de contraseñas web tipo Bitwarden/1Password simplificado, con arquitectura profesional y principio **Zero-Knowledge**: el servidor (Supabase) nunca debe poder leer contraseñas, notas, claves SSH ni ningún dato sensible en texto plano. Solo almacena ciphertext, IV, salt y metadata no sensible.

## Stack técnico (fijo, no cambiar)

**Frontend:** Next.js 14+ (App Router), TypeScript estricto (`strict: true`), Tailwind CSS, shadcn/ui, React Hook Form + Zod, Zustand.

**Backend:** Sin backend tradicional. Todo vía Supabase (Auth, PostgreSQL, Storage, Edge Functions si son necesarias).

**Criptografía:** Exclusivamente **Web Crypto API nativa** (`crypto.subtle`). No uses CryptoJS ni ninguna librería externa para AES, derivación de claves o generación de IV/salt.

> Nota de diseño ya resuelta: se descartó Argon2id porque Web Crypto API no lo implementa nativamente y usarlo obligaría a una librería WASM externa, lo cual contradice la regla anterior. Usamos **PBKDF2 con SHA-256 y mínimo 600,000 iteraciones**, que sí es nativo de Web Crypto API y es un estándar aceptado (OWASP lo recomienda como mínimo). No reabras este debate ni cambies a Argon2id.

## Arquitectura de carpetas

```
app/
components/
features/
hooks/
services/
repositories/
lib/
  crypto/
store/
types/
utils/
validators/
constants/
supabase/
  migrations/
middleware/
styles/
```

Separación estricta: la UI nunca debe llamar directamente a Supabase ni a funciones criptográficas — siempre pasa por `services/` y `repositories/`. Las funciones de `lib/crypto/` deben ser puras (sin efectos secundarios, sin llamadas a red) y testeables de forma aislada.

## Flujo criptográfico (implementar EXACTAMENTE así)

1. Login normal vía Supabase Auth (email/password u OAuth) — esto identifica QUIÉN es el usuario, no da acceso al vault.
2. El usuario introduce su **contraseña maestra** (puede coincidir con la de Supabase Auth o no — usa una separada por defecto para mayor seguridad, y documenta esta decisión en el README).
3. La contraseña maestra **nunca se envía al servidor ni se almacena**, ni en texto plano ni hasheada.
4. Deriva una clave con PBKDF2 (`crypto.subtle.deriveKey`), SHA-256, ≥600,000 iteraciones, usando un `salt` único por usuario generado en el registro y guardado en la tabla `profiles` (el salt no es secreto, puede vivir en la DB en claro).
5. Cifra cada campo sensible de una credencial con AES-256-GCM (`crypto.subtle.encrypt`), generando un IV aleatorio nuevo por cada operación de cifrado.
6. Supabase solo almacena: `ciphertext`, `iv`, y metadata no sensible (categoría, favorito, fechas, nombre de la plataforma si decides no cifrarlo).
7. El descifrado ocurre solo en memoria, solo cuando se necesita mostrar el dato.

## Reglas de seguridad que NUNCA debes romper

- Nunca escribas la master key ni datos descifrados en `localStorage`, `sessionStorage`, `IndexedDB` ni cookies. Solo en estado de Zustand (memoria volátil).
- Nunca loguees (`console.log`) contraseñas, master key, ni claves derivadas, ni siquiera durante debugging. Si necesitas debuggear cifrado, loguea longitudes o booleanos, no el contenido.
- Nunca implementes un "recuperar contraseña maestra" que la reconstruya — si el usuario la pierde, el vault es irrecuperable por diseño (esto es correcto en Zero-Knowledge, explícaselo al usuario en la UI, no lo evites).
- Auto-bloqueo obligatorio: limpiar la master key de memoria tras inactividad configurable, cambio de pestaña prolongado, o cierre de sesión.
- Para HaveIBeenPwned: usa el modelo k-Anonymity (solo se envía el prefijo de 5 caracteres del hash SHA-1 de la contraseña, nunca la contraseña ni el hash completo).
- Exportaciones/backups: siempre en JSON cifrado, nunca texto plano.
- Si en algún punto una funcionalidad pedida en `plan.md` te obliga a violar alguna de estas reglas, **detente, no implementes esa parte, y déjalo anotado como pendiente de decisión humana** en `DECISIONS_NEEDED.md` (créalo si no existe). No tomes atajos inseguros para poder "completar" una fase.

## Conexión con Supabase

**Importante sobre las claves:** el `ANON_KEY` es una clave pública para el cliente (navegador) y respeta RLS — no puede crear tablas, políticas ni ejecutar migraciones DDL. NO la uses para administrar la base de datos, y NO pidas ni uses la `SERVICE_ROLE_KEY` para este proyecto: es un secreto de administrador total y no debe pasar por el chat ni quedar hardcodeada en ningún archivo (ya hubo un incidente de exposición de esta clave en otro proyecto — extremar precaución aquí).

En su lugar, usa el **Supabase CLI**, ya autenticado y vinculado al proyecto antes de iniciar esta sesión (`supabase login` + `supabase link` corridos manualmente por el usuario de antemano). Con eso:

- Genera las migraciones SQL como archivos en `supabase/migrations/` (tablas, ENUMs, índices, triggers, funciones, políticas RLS, buckets de Storage).
- Aplícalas con `supabase db push` (usa la sesión local del CLI, no requiere ninguna key en texto).
- El usuario no debe crear nada manualmente en el dashboard de Supabase — todo vía migraciones versionadas.
- Para el `.env.local` de la app en tiempo de ejecución, solo van `SUPABASE_URL` y `SUPABASE_ANON_KEY` (esas sí son seguras de tener en el cliente, porque RLS las limita).

Si en algún punto el CLI no está vinculado o pide autenticación interactiva y no puedes continuar, detente, anótalo en `DECISIONS_NEEDED.md` con instrucciones claras de qué comando debe correr el usuario, y sigue con otra parte del plan que no dependa de la base de datos.

Row Level Security es obligatorio en TODAS las tablas con datos de usuario, sin excepción. Cada política debe quedar comentada explicando qué permite y por qué.

## Preparación ANTES de iniciar la sesión autónoma (hazlo tú, manualmente)

Esto debe quedar listo antes de dejar a Claude Code trabajando solo, o se quedará bloqueado en la Fase 2 esperando autenticación interactiva:

1. Instala el Supabase CLI si no lo tienes: `npm install -g supabase` (o el método que prefieras).
2. Corre `supabase login` — abre el navegador, autentícate una vez. La sesión queda guardada localmente.
3. Corre `supabase link --project-ref TU_PROJECT_REF` dentro de la carpeta del proyecto (el project-ref lo ves en la URL de tu dashboard de Supabase).
4. Crea `.env.local` con `SUPABASE_URL` y `SUPABASE_ANON_KEY` (estas sí las puedes pegar, son seguras para el cliente).
5. Confirma que `.env.local` está en `.gitignore`.

Con esto, Claude Code puede correr `supabase db push` y comandos del CLI toda la noche sin pedirte nada.

## Cómo trabajar durante esta sesión (autónoma, sin supervisión en vivo)

1. Trabaja siguiendo el orden de fases de `plan.md`, una fase a la vez, sin saltarte pasos.
2. Al terminar cada fase: corre los tests correspondientes, verifica que compila/lint pasa, y **antes de avanzar a la siguiente fase**, escribe un resumen breve en `PROGRESS_LOG.md` (créalo si no existe) con: qué se implementó, qué decisiones técnicas tomaste y por qué, y qué quedó pendiente o dudoso.
3. Si te encuentras con una decisión de producto ambigua (ej. "¿cuánto tiempo de auto-bloqueo por defecto?"), toma la opción más segura/conservadora razonable, documenta la decisión en `PROGRESS_LOG.md`, y continúa — no te bloquees esperando respuesta.
4. Si te encuentras con una decisión que compromete seguridad de forma real (no solo UX), sigue la regla de la sección anterior: detente esa parte específica, anótala en `DECISIONS_NEEDED.md`, y continúa con el resto del plan que no dependa de ella.
5. Haz commits pequeños y descriptivos por unidad de trabajo completada (ej. "feat: PBKDF2 key derivation + tests", no un solo commit gigante al final).
6. No implementes nada de una fase futura por adelantado aunque te parezca rápido — mantén el orden, cada fase depende de que la anterior esté verificada.
7. Prioriza que el módulo criptográfico (Fase 4 en el plan) tenga tests sólidos antes de construir CRUD encima — es la base de todo lo demás.
