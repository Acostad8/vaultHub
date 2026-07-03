# plan.md — Fases del proyecto

Marca cada casilla al completar y verificar (tests + build/lint pasando) antes de avanzar. Registra el cierre de cada fase en `PROGRESS_LOG.md`.

## Fase 1 — Inicialización y configuración
- [x] Crear proyecto Next.js 14+ (App Router, TypeScript estricto)
- [x] Configurar Tailwind CSS + shadcn/ui
- [x] Configurar ESLint + Prettier
- [x] Crear estructura de carpetas según CLAUDE.md
- [x] Configurar `.env.example` con las variables necesarias (sin valores reales)
- [x] Configurar cliente de Supabase (browser + server)

## Fase 2 — Conexión con Supabase y base de datos
- [ ] Solicitar SUPABASE_URL y SUPABASE_ANON_KEY al usuario
- [ ] Diseñar y crear migraciones SQL para: `profiles`, `vault_items`, `categories`, `tags`, `password_history`, `shared_items`, `audit_log`, `sessions`/`trusted_devices`
- [ ] Crear ENUMs necesarios (tipo de item: password/nota/API key/SSH key/tarjeta, etc.)
- [ ] Crear índices y foreign keys
- [ ] Crear políticas RLS para cada tabla (comentadas)
- [ ] Crear triggers necesarios (ej. `updated_at` automático)
- [ ] Crear bucket de Storage para archivos adjuntos cifrados
- [ ] Verificar que todas las migraciones corren limpias desde cero

## Fase 3 — Autenticación
- [ ] Registro e inicio de sesión con email/password (Supabase Auth)
- [ ] OAuth con Google
- [ ] Verificación de correo
- [ ] Recuperación de contraseña de cuenta (NO de la master key — son cosas distintas, ver CLAUDE.md)
- [ ] Middleware de rutas protegidas

## Fase 4 — Módulo criptográfico Zero-Knowledge (crítico)
- [x] Función de generación de salt por usuario (al registrarse)
- [x] Función de derivación de clave con PBKDF2 (Web Crypto API, ≥600,000 iteraciones)
- [x] Función de cifrado AES-256-GCM
- [x] Función de descifrado AES-256-GCM
- [x] Manejo de la master key en Zustand (memoria, nunca persistida)
- [x] Auto-bloqueo por inactividad/cambio de pestaña/cierre
- [x] **Tests unitarios exhaustivos**: cifrar→descifrar da el original, IVs son únicos por operación, falla correctamente con clave incorrecta, etc.
- [x] Documentar el flujo completo en `docs/CRYPTO_FLOW.md`

## Fase 5 — CRUD de credenciales
- [ ] Crear/ver/editar/eliminar credenciales (con cifrado/descifrado transparente)
- [ ] Categorías y carpetas
- [ ] Etiquetas múltiples
- [ ] Favoritos
- [ ] Papelera (soft delete) con restaurar y eliminar permanente
- [ ] Búsqueda y filtros (por nombre, usuario, dominio, categoría, etiqueta)
- [ ] Soporte para tipos adicionales: notas seguras, API keys, claves SSH, tokens

## Fase 6 — Dashboard y estadísticas
- [ ] Resumen: total de cuentas, fuertes/débiles, duplicadas, favoritas
- [ ] Analizador de fortaleza (entropía, tiempo estimado de ruptura)
- [ ] Detección de contraseñas duplicadas
- [ ] Integración HaveIBeenPwned (k-Anonymity, solo prefijo SHA-1)
- [ ] Generador de contraseñas configurable (longitud, símbolos, pronunciables, excluir ambiguos)

## Fase 7 — Funciones avanzadas
- [ ] 2FA con TOTP (QR + códigos de recuperación)
- [ ] Historial de cambios por credencial (cifrado)
- [ ] Auditoría (login, logout, desbloqueo, exportación, cambios, compartidos)
- [ ] Sesiones activas y cierre remoto
- [ ] Dispositivos confiables
- [ ] Compartir credenciales con permisos (lectura/edición) y expiración
- [ ] Exportar/importar backup en JSON cifrado
- [ ] Archivos adjuntos cifrados (PDF, TXT, DOCX, JSON, CSV)

## Fase 8 — Pulido, pruebas y documentación
- [ ] Modo claro/oscuro, responsive, skeletons, toasts, confirmaciones
- [ ] Accesibilidad (WCAG, navegación por teclado, ARIA)
- [ ] Pruebas de integración de flujos principales
- [ ] Pruebas E2E (login, desbloqueo, crear credencial)
- [ ] README completo + guía de instalación + `.env.example`
- [ ] Diagrama de arquitectura y ERD
- [ ] Manual de despliegue en Vercel

## Notas para trabajo autónomo
- No avances de fase sin verificar la anterior (tests + lint/build).
- Ante ambigüedad de producto: decide con criterio conservador y documenta en `PROGRESS_LOG.md`.
- Ante ambigüedad que comprometa seguridad real: detente esa parte, anótala en `DECISIONS_NEEDED.md`, sigue con el resto.
