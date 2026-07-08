# VaultHub

Gestor de contraseñas **Zero-Knowledge** con arquitectura profesional. Inspirado en Bitwarden/1Password, simplificado.

**Zero-Knowledge** significa que el servidor (Supabase) jamás puede leer contraseñas, notas, claves SSH ni ningún dato sensible del vault en texto plano. Solo almacena ciphertext, IV y metadata no sensible. La master key nunca sale del navegador del usuario.

## Stack

- **Frontend:** Next.js 16 (App Router, Turbopack), TypeScript estricto, Tailwind CSS v4, shadcn/ui (base-nova).
- **Estado:** Zustand (memoria volátil).
- **Backend:** Supabase (Auth + PostgreSQL con RLS + Storage). Sin backend tradicional.
- **Cripto:** **Solo Web Crypto API nativa** (`crypto.subtle`). Sin CryptoJS, sin librerías WASM.
- **Tests:** Vitest.

### Cripto — lo importante en tres líneas

- **KDF:** PBKDF2-SHA-256, mínimo 600 000 iteraciones (OWASP 2023), salt de 32 bytes único por usuario.
- **Cifrado simétrico:** AES-256-GCM, IV de 12 bytes aleatorio nuevo por cada operación.
- Todo esto documentado en [`docs/CRYPTO_FLOW.md`](docs/CRYPTO_FLOW.md).

## Estructura

```
app/            Rutas App Router
components/     UI reutilizable (shadcn en components/ui/)
features/       Módulos verticales (auth, vault, sharing, etc)
hooks/          Hooks React (use-auto-lock, etc)
services/       Orquestación: cifra/descifra + persistencia
repositories/   Acceso a Supabase (queries, mutations)
lib/
  crypto/       PBKDF2 + AES-GCM + payload JSON (puro, testeable)
  password/     Generador + strength meter + HIBP k-anonymity
  totp/         RFC 6238 con Web Crypto HMAC
  supabase/     Clients browser + server + proxy (Next 16)
store/          Zustand (vault-lock, etc)
types/          Tipos compartidos
utils/          Helpers puros
validators/     Schemas Zod
constants/      Constantes de UI (auto-lock defaults, etc)
supabase/
  migrations/   Migraciones SQL versionadas
middleware/     Helpers de proxy
styles/         Estilos globales adicionales
docs/           CRYPTO_FLOW.md y otros
```

Regla arquitectónica: la UI **jamás** llama directo a Supabase ni a `lib/crypto/`. Todo pasa por `services/` (que sí puede orquestar los dos).

## Instalación

Requisitos: Node 20+, npm 10+, [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started).

```bash
# 1. Deps
npm install

# 2. Supabase local (una sola vez)
supabase login
supabase link --project-ref TU_PROJECT_REF
# Copiar valores del dashboard Supabase (Settings → API)
cp .env.example .env.local
# Editar .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Aplicar migraciones
supabase db push

# 4. Dev
npm run dev
```

**Nunca** pongas la `SERVICE_ROLE_KEY` en `.env.local`, en el chat ni en ningún archivo. Es un secreto de administrador total.

## Scripts

| | |
|---|---|
| `npm run dev` | Dev server con Turbopack. |
| `npm run build` | Build de producción. |
| `npm run start` | Sirve el build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run format` | Prettier con `prettier-plugin-tailwindcss`. |
| `npm test` | Vitest run (todos los tests). |
| `npm run test:watch` | Vitest en modo watch. |
| `npm run test:coverage` | Vitest con coverage v8. |

## Funcionalidades

- **Vault cifrado E2E** — 7 tipos de item (password, nota, API key, SSH, tarjeta, identidad, TOTP), categorías y tags cifrados, favoritos, papelera con restaurar/purgar, búsqueda y filtros 100% client-side.
- **Catálogo de plataformas** — 40 presets (Instagram, Google, Netflix…) con logos locales (`simple-icons`, cero requests a terceros) que pre-llenan nombre + URL.
- **Dashboard de salud** — fortaleza (entropía + tiempo de crackeo), duplicados, HIBP vía k-Anonymity.
- **Generador de contraseñas** configurable + TOTP viewer (RFC 6238).
- **2FA de cuenta** — Supabase MFA TOTP (`/security`), challenge post-login (`/mfa`), skip en dispositivos confiables.
- **Sesiones y dispositivos** (`/devices`) — heartbeat por dispositivo, revocación remota, cerrar otras sesiones.
- **Compartir credenciales E2E** — RSA-OAEP 3072 por usuario; snapshot cifrado con AES efímera envuelta con la pública del destinatario. Expiración configurable.
- **Adjuntos cifrados** — blob y nombre cifrados client-side antes de subir a Storage (max 20 MB).
- **Backup** — export/import JSON cifrado (PBKDF2 + AES-GCM) + vista previa descifrada solo en memoria.
- **Auditoría** (`/audit`) — login, unlock, cambios, exports.
- **Tema claro/oscuro/sistema** + skeletons + toasts + diálogos de confirmación accesibles.

## Estado actual del proyecto

Ver [`plan.md`](plan.md) para el checklist canónico y [`PROGRESS_LOG.md`](PROGRESS_LOG.md) para el detalle de cada fase completada.

- ✅ Fases 1–7 — completas (setup, DB+RLS, auth, cripto, CRUD, dashboard, avanzadas).
- 🟨 Fase 8 — pulido y docs en curso. Pendiente: E2E con Playwright (requiere descarga de browsers), Google OAuth (config manual en dashboards, ver `DECISIONS_NEEDED.md`).

## Documentación

- [`docs/CRYPTO_FLOW.md`](docs/CRYPTO_FLOW.md) — flujo criptográfico completo.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — diagrama de arquitectura + ERD.
- [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md) — manual de despliegue.

## Reglas de seguridad no negociables

Estas están en [`CLAUDE.md`](CLAUDE.md) también. Repetidas aquí porque son duras:

- La master key **no se persiste**. Ni `localStorage`, ni `sessionStorage`, ni `IndexedDB`, ni cookies. Solo Zustand en memoria.
- No `console.log` de contraseñas, master key ni claves derivadas — nunca, ni en debug.
- No hay recuperación de master password. Si el usuario la pierde, el vault se pierde (por diseño Zero-Knowledge).
- Auto-lock obligatorio: inactividad, pestaña oculta, cierre de sesión.
- HIBP solo vía k-Anonymity (prefijo SHA-1 de 5 chars). Nunca el password completo ni el hash entero.
- Exportaciones/backups: solo JSON cifrado, jamás texto plano.

Si alguna funcionalidad futura obliga a romper una de estas, se documenta en `DECISIONS_NEEDED.md` y NO se implementa hasta resolver.

## Contribuir

Este es un proyecto personal. Si te interesa, abre un issue primero antes de un PR — quiero mantener el diseño consistente con el flujo cripto documentado.

## Licencia

MIT (pendiente archivo LICENSE).
