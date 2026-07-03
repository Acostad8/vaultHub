# CRYPTO_FLOW.md — Flujo criptográfico de VaultHub

Este documento describe **exactamente** cómo se maneja la criptografía en VaultHub. Es la referencia autoritaria del proyecto — si el código y este documento discrepan, alguno de los dos tiene un bug.

## Principio: Zero-Knowledge

El servidor (Supabase) **nunca** debe poder leer:

- Master password del usuario.
- Master key derivada.
- Cualquier campo sensible: nombres de credenciales, usuarios, passwords, URLs, notas, TOTP secrets, claves SSH, contenido de archivos adjuntos, nombres de categorías/tags.

Lo único que sí ve el servidor:

- Email de autenticación (Supabase Auth lo necesita para login).
- `master_password_salt` (por definición público, no secreto).
- `kdf_iterations` (parámetro público del KDF).
- Metadata operativa: tipo de ítem (`vault_item_type`), favorito, timestamps, category_id, tag_id, `deleted_at`.
- Ciphertext + IV en base64.

## Algoritmos y parámetros

Todos definidos en [`lib/crypto/constants.ts`](../lib/crypto/constants.ts).

| Parámetro | Valor | Motivo |
|---|---|---|
| KDF | PBKDF2-SHA-256 | Estándar aceptado, nativo en Web Crypto API (no requiere WASM externo). |
| Iteraciones PBKDF2 | **≥ 600 000** (default) | Mínimo OWASP 2023 para PBKDF2-SHA-256. Se puede subir sin romper vaults existentes (cada perfil guarda su propia cuenta). |
| Salt PBKDF2 | 32 bytes aleatorios (256 bits) | Único por usuario. Público. Almacenado en `profiles.master_password_salt` en base64. |
| Cifrado simétrico | AES-256-GCM | AEAD nativo en Web Crypto API — confidencialidad + autenticidad en una sola primitiva. |
| Tamaño de clave AES | 256 bits | Máximo estándar. |
| IV AES-GCM | 12 bytes aleatorios (96 bits) | Recomendado por RFC 5116 para GCM. Único por operación de cifrado. |

**Decisión de diseño explícita: NO se usa Argon2id** aunque sea más resistente que PBKDF2, porque Web Crypto API no lo implementa nativamente. Introducir una librería WASM violaría la regla de "solo primitivas nativas del navegador" (ver `CLAUDE.md`). Este debate está cerrado.

## Flujo de registro (una vez por usuario)

```
1. Usuario se registra en Supabase Auth con email + password de cuenta.
   (Esta password es DISTINTA de la master password, ver decisión abajo.)

2. Trigger SQL `handle_new_user()` inserta un row en `profiles` con:
     - master_password_salt = random 32 bytes en base64
     - kdf_iterations = 600_000

3. Al primer login, el usuario introduce su master password.
   - VaultHub deriva la master key con PBKDF2(password, salt, iterations).
   - La master key vive SOLO en el store Zustand en memoria.
   - La master password se descarta inmediatamente (referencia sale de scope).

4. Con la master key derivada, se puede cifrar el primer ítem del vault.
```

### ¿Por qué master password separada de la password de cuenta?

- La password de Supabase Auth **sí sale al servidor** (Supabase la hashea con bcrypt y la guarda). Si el usuario perdiera acceso a la cuenta, Supabase puede resetearla vía email.
- La master password **jamás sale al cliente**. No hay forma de recuperarla — si se pierde, el vault es irrecuperable por diseño.
- Reutilizarlas confunde estas dos garantías. Mantenerlas separadas hace explícito para el usuario que la master password es especial.

## Flujo de cifrado de un ítem

Se cifra **un blob JSON único por ítem**, no campo por campo. Ver `PROGRESS_LOG.md` Fase 2 para el razonamiento.

```
1. Cliente construye objeto JS con TODOS los campos sensibles:
     {
       name: "GitHub",
       username: "acostad8",
       password: "hunter2",
       url: "https://github.com",
       notes: "…",
       custom_fields: [...]
     }

2. JSON.stringify(objeto) → string UTF-8.

3. TextEncoder.encode → Uint8Array.

4. Genera IV aleatorio nuevo (12 bytes crypto.getRandomValues).

5. crypto.subtle.encrypt({ name: "AES-GCM", iv }, masterKey, bytes)
   → ArrayBuffer con ciphertext + authentication tag (16 bytes al final).

6. Se persisten:
     - payload_ciphertext = base64(ArrayBuffer)
     - payload_iv         = base64(IV)
     - item_type          (no cifrado; metadata)
     - category_id        (no cifrado; metadata)
     - is_favorite        (no cifrado)
     - created_at, updated_at, deleted_at (no cifrado)
```

Cada operación de cifrado genera un **IV único aleatorio**. Reutilizar IV con la misma key rompe AES-GCM catastróficamente — el módulo (`aes.ts`) garantiza IV nuevo en cada llamada; ningún caller debería pasar su propio IV.

## Flujo de descifrado

```
1. Cliente hace SELECT del vault_item vía Supabase (RLS filtra por auth.uid()).

2. Cliente recibe payload_ciphertext (base64), payload_iv (base64).

3. base64 → Uint8Array para ambos.

4. crypto.subtle.decrypt({ name: "AES-GCM", iv }, masterKey, ciphertext)
   Si key/iv/ciphertext no coinciden con los originales, o el auth tag
   no valida (tamper), lanza DOMException.

5. TextDecoder.decode → JSON string → JSON.parse → objeto original.

6. UI muestra el objeto. El objeto y la master key nunca se persisten.
```

## Manejo de la master key

Ver [`store/vault-lock.ts`](../store/vault-lock.ts) y [`hooks/use-auto-lock.ts`](../hooks/use-auto-lock.ts).

### Persistencia

- La master key es un `CryptoKey` no-extractable (`extractable: false` en `deriveKey`) — el navegador no permite exportarla a bytes ni siquiera desde JS. Esto la protege ante código malicioso in-process (aunque XSS grave sigue siendo peligroso: puede llamar encrypt/decrypt con ella; ver "Amenazas fuera de alcance" abajo).
- La master key vive **solo en el store Zustand `useVaultLock`**. Nunca en:
  - `localStorage`, `sessionStorage`, `IndexedDB`, cookies.
  - Estado de React persistido con middleware `persist` de Zustand.
  - Variables globales (`window.*`).
  - Cache HTTP.
- No hay ningún camino en el código donde la master password o master key se pase a `console.log` — ni siquiera en debug builds.

### Auto-lock (obligatorio)

Se activa vía `useAutoLock({ autoLockMinutes })` cerca de la raíz de la app. Dispara `lock()` (limpia la key de memoria) cuando:

- Pasan N minutos sin actividad del usuario (default 5, configurable 1–60 en `profiles.auto_lock_minutes`).
- La pestaña queda oculta más de X (opcional, `lockOnHidden` default true).
- El usuario cierra sesión.
- `beforeunload` (defensa en profundidad al cerrar/recargar la pestaña).

Después de un lock, para volver a operar hay que re-introducir la master password.

## Compartir ítems entre usuarios (planeado, Fase 7)

Pendiente. Requiere un par de claves asimétricas (RSA-OAEP o ECDH-P256) por usuario, generadas al registrarse:

1. El owner deriva/exporta la clave simétrica del ítem (o genera una clave por ítem cifrada con la master key — TBD).
2. Re-cifra esa clave con la clave pública del recipient.
3. Guarda `encrypted_key_ciphertext + encrypted_key_iv` en `shared_items`.
4. El recipient descifra la clave con su clave privada, y con ella descifra el ítem.

La estructura de la tabla `shared_items` ya está lista, pero el flujo criptográfico completo se documentará y se implementará en Fase 7. Ver `DECISIONS_NEEDED.md` si al llegar a Fase 7 no está resuelto el diseño del par asimétrico.

## HaveIBeenPwned (Fase 6)

k-Anonymity strict: el cliente calcula SHA-1 del password EN TEXTO PLANO (sin salt, es lo que exige la API de HIBP), toma los primeros 5 caracteres hex, y envía SOLO esos 5 caracteres a `api.pwnedpasswords.com/range/{prefix}`. HIBP devuelve todos los sufijos que coinciden con ese prefijo; el cliente busca el suyo localmente. **El password completo NUNCA sale del cliente, ni el hash SHA-1 completo.**

## Exportación / backup (Fase 7)

Solo en JSON cifrado. Nunca texto plano. Formato:

```json
{
  "version": 1,
  "kdf": { "algo": "PBKDF2-SHA256", "iterations": 600000, "salt": "<base64>" },
  "cipher": { "algo": "AES-256-GCM", "iv": "<base64>", "ciphertext": "<base64>" }
}
```

El `salt` puede ser el mismo del profile o uno nuevo (a decidir en Fase 7). El `ciphertext` es el JSON del vault entero (items + categorías + tags) cifrado con la master key derivada.

## Amenazas fuera de alcance

Zero-Knowledge protege contra un servidor comprometido / curioso. NO protege contra:

- **XSS en el cliente**: si un atacante inyecta JS en la app corriendo con vault desbloqueado, puede llamar `masterKey.encrypt/decrypt` con ella (aunque no la puede exportar). Mitigación: CSP estricto en Fase 8, sanitización de todo HTML, no `dangerouslySetInnerHTML`.
- **Malware en el dispositivo**: si el sistema operativo del usuario está comprometido, no hay defensa a nivel app.
- **Keylogger físico o extensión de navegador maliciosa**: capturan la master password directamente. Fuera de alcance.
- **Servidor forzando actualización maliciosa del cliente**: en una web app, el usuario recibe JS del servidor. Si el servidor sirve JS malicioso, puede robar la master password. Mitigación parcial: build reproducible + Subresource Integrity + Certificate Transparency. Documentar limitación en README.
