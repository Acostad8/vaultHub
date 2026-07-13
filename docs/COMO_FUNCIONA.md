# Cómo funciona VaultHub — Guía sencilla

> Explicación en lenguaje llano del sistema completo: qué hace, cómo cifra, dónde vive cada dato y por qué el servidor no puede leer tu vault.
> Para el detalle técnico exhaustivo ver `docs/CRYPTO_FLOW.md` y `docs/ARCHITECTURE.md`.

---

## 1. Qué es VaultHub en una frase

Un gestor de contraseñas web (tipo Bitwarden/1Password) donde **el servidor solo guarda datos cifrados**. Ni Supabase, ni Vercel, ni un atacante que robe la base de datos pueden leer tus contraseñas. Solo tú, con tu **contraseña maestra**, puedes descifrarlas — dentro de tu navegador.

Esto se llama **Zero-Knowledge**: el servicio "no sabe" lo que guarda.

---

## 2. Las dos contraseñas (importante entender la diferencia)

VaultHub usa **dos contraseñas distintas** con roles muy diferentes:

| Contraseña | Sirve para | Se envía al servidor? |
|---|---|---|
| **Contraseña de cuenta** (email/OAuth de Supabase) | Decir "quién eres" (login normal) | Sí (Supabase la hashea, es como cualquier login) |
| **Contraseña maestra** (master password) | Cifrar/descifrar tu vault | **NUNCA**. Jamás sale de tu navegador |

Analogía: la contraseña de cuenta abre la puerta del edificio. La contraseña maestra abre tu caja fuerte personal dentro del edificio. El conserje (Supabase) tiene llave del edificio, pero no de tu caja fuerte.

---

## 3. Dónde vive cada cosa

### En tu navegador (RAM, se borra al cerrar)
- Tu **contraseña maestra** mientras la tipeas.
- La **clave derivada** (`masterKey`) que resulta del PBKDF2.
- Los datos **descifrados** cuando necesitas verlos.
- Almacenados en el estado de Zustand (memoria volátil). **Nunca** en `localStorage`, `sessionStorage`, `IndexedDB` ni cookies.

### En Supabase (persistente, cifrado)
Tabla `profiles`:
- Tu email, nombre para mostrar.
- Tu **salt** único de PBKDF2 (público, no es secreto).
- Cuántas iteraciones PBKDF2 usaste (600 000 por defecto).
- Minutos de auto-lock (default 5).

Tabla `vault_items`:
- **`payload_ciphertext`**: el JSON con nombre, usuario, URL, contraseña, notas — todo cifrado en un solo blob.
- **`payload_iv`**: el vector de inicialización único de ese cifrado.
- Metadata **no** sensible: tipo (password/nota/tarjeta/etc), favorito, fechas, categoría.

Otras tablas (`categories`, `tags`, `password_history`, `attachments`, `shared_items`) siguen la misma idea: los campos sensibles cifrados, la metadata operativa en claro.

### Lo que **NUNCA** se guarda en Supabase
- Tu contraseña maestra (ni plana, ni hasheada, ni cifrada).
- La `masterKey` derivada.
- Cualquier dato descifrado.

---

## 4. Flujo criptográfico paso a paso

### 4.1 Registro (una vez)

1. Te registras en Supabase con email + contraseña de cuenta.
2. Un trigger de Postgres crea tu `profile` con un **salt aleatorio de 32 bytes**.
3. Aún no existe vault ni contraseña maestra.

### 4.2 Primer unlock (defines la maestra)

1. Introduces tu **contraseña maestra** en el navegador.
2. Se deriva la `masterKey`:
   ```
   masterKey = PBKDF2(
     password  = tu contraseña maestra,
     salt      = tu salt (viene del profile),
     iters     = 600 000,
     hash      = SHA-256,
     keyLen    = 256 bits
   )
   ```
3. Se guarda un **verifier** en Supabase: un blob de prueba cifrado con `masterKey`. Sirve solo para detectar "contraseña maestra incorrecta" en próximos unlocks. No revela la clave.

### 4.3 Guardar una credencial

1. Escribes: nombre, usuario, URL, password, notas.
2. Se arma un JSON:
   ```json
   { "name": "Gmail", "username": "yo@x.com", "password": "s3cr3t", "notes": "..." }
   ```
3. Se genera un **IV aleatorio nuevo de 12 bytes**.
4. Se cifra con AES-256-GCM usando `masterKey` + IV.
5. Se envía a Supabase **solo** `ciphertext + iv + metadata no sensible`.
6. Nunca se envía el JSON en claro ni la `masterKey`.

### 4.4 Leer una credencial

1. Supabase devuelve `ciphertext + iv`.
2. Tu navegador descifra con AES-GCM(`masterKey`, `iv`, `ciphertext`).
3. Si el GCM tag no valida → dato corrupto/modificado → error, no se muestra nada.
4. Si valida → tienes el JSON en RAM, se muestra.

### 4.5 Auto-lock

- Tras N minutos de inactividad (default 5, configurable 1–60) la `masterKey` se **borra de memoria**.
- Para seguir usando el vault debes reintroducir la contraseña maestra.
- Cierre de pestaña → `masterKey` desaparece automáticamente (RAM se libera).

---

## 5. Algoritmos y por qué estos

| Uso | Algoritmo | Por qué |
|---|---|---|
| Derivar `masterKey` de la password | **PBKDF2 + SHA-256, 600 000 iters** | Nativo en Web Crypto API. OWASP 2023 lo acepta. Argon2id sería mejor pero no es nativo (requeriría librería WASM externa, contradice la regla del proyecto). |
| Cifrar payloads | **AES-256-GCM** | Estándar, autenticado (detecta modificaciones), rápido, nativo. |
| Generar IV / salt | **`crypto.getRandomValues`** | CSPRNG nativo del navegador. |
| RSA para vault compartido | **RSA-OAEP 2048** | Cifrar la clave AES del item compartido con la clave pública del receptor. |
| Comprobar contraseñas filtradas | **HIBP con k-Anonymity** | Solo se envían los primeros 5 chars del SHA-1 de la password. La password nunca sale. |

**Todo vía `crypto.subtle` nativo.** No hay CryptoJS ni librerías externas de criptografía.

---

## 6. Arquitectura por capas

La UI **nunca** habla directo con Supabase ni con `crypto.subtle`. Siempre pasa por capas:

```
Componente React (UI)
       ↓ llama
Hook / Store Zustand
       ↓ llama
services/  ← lógica de negocio
       ↓ llama
repositories/  ← queries a Supabase
       ↓
Supabase (Postgres + Storage + Auth)

lib/crypto/  ← funciones puras (kdf, aes, rsa, base64, random)
       ↑ usadas por services
```

- `lib/crypto/` son **funciones puras**: entran bytes, salen bytes. Sin efectos secundarios, sin red, testables aisladamente.
- `services/` orquestan: llaman a crypto + repositorios.
- `repositories/` son la única capa que toca Supabase.

Esto significa que reemplazar Supabase por otro backend solo tocaría `repositories/`, no la crypto ni la UI.

---

## 7. Row Level Security (RLS)

**Todas** las tablas con datos de usuario tienen RLS activado en Postgres. Reglas típicas:

- `SELECT`: `auth.uid() = user_id` → solo ves tus filas.
- `INSERT`: `WITH CHECK (auth.uid() = user_id)` → no puedes crear filas ajenas.
- `UPDATE`: solo dueño, y no puedes transferir la fila a otro `user_id`.
- `DELETE`: solo dueño.

Aunque un atacante robe la `ANON_KEY` pública, RLS bloquea el acceso a datos ajenos. Y aunque bypasseara RLS, seguiría viendo solo ciphertext.

---

## 8. Compartir un item con otro usuario

1. Tu navegador genera una **clave AES simétrica nueva** para ese item compartido.
2. Cifra el item con esa clave.
3. Busca la **clave pública RSA** del receptor.
4. Cifra la clave AES con la pública RSA del receptor → `wrapped_key`.
5. Supabase guarda: `ciphertext_item + wrapped_key + destinatario_id`.
6. El receptor descifra `wrapped_key` con su privada (que solo él tiene, cifrada con su propia `masterKey`) y luego descifra el item.

Resultado: el servidor nunca ve la clave AES en claro.

---

## 9. Adjuntos cifrados (Storage)

1. Seleccionas un archivo.
2. Se lee como bytes en el navegador.
3. Se cifra el contenido **y** el MIME type con AES-GCM (`masterKey` + IV nuevo).
4. Se sube el blob cifrado a Supabase Storage.
5. La metadata (nombre, tamaño, IV) va a la tabla `attachments`.
6. Al descargar: descarga blob cifrado → descifra en el navegador → sirve al usuario.

Supabase Storage nunca ve el archivo original.

---

## 10. Import / Export / Backup

- **Export manual**: JSON **cifrado** con una passphrase que tú eliges en el momento (nunca en claro).
- **Import**: parsers para varios formatos (Bitwarden, 1Password, LastPass, CSV) — los datos entran a memoria, se cifran, se suben.
- **Auto-backup**: mismo formato JSON cifrado, programado.
- **Nunca** se exporta ni importa nada en texto plano.

---

## 11. Reglas de seguridad que el código NUNCA rompe

- `masterKey` **jamás** en `localStorage`, `sessionStorage`, `IndexedDB`, cookies. Solo Zustand (RAM).
- **Nunca** `console.log` de passwords, `masterKey` ni claves derivadas. Ni en debug.
- **No** existe "recuperar contraseña maestra". Si la pierdes, tu vault es irrecuperable **por diseño**. Es la garantía Zero-Knowledge — un mecanismo de recuperación implicaría que el servidor puede reconstruir la clave.
- HIBP con k-Anonymity siempre (nunca la password completa a servicios externos).
- Exports/backups siempre cifrados.
- `.env.local` solo con `SUPABASE_URL` y `SUPABASE_ANON_KEY` (ambas seguras para cliente por RLS). **Nunca** `SERVICE_ROLE_KEY` en el repo ni en chat.

---

## 12. Escenarios de ataque y por qué el diseño resiste

| Ataque | Resultado |
|---|---|
| Se roban la base de datos entera de Supabase | Solo ven ciphertext + salt + IVs. Sin `masterKey` no se descifra. Rompen el AES-256 → premio Turing. |
| Se roban la `ANON_KEY` pública | RLS bloquea leer datos ajenos. Aunque leyeran algo, sigue siendo ciphertext. |
| Un empleado de Supabase con acceso admin | Igual que arriba: solo ve ciphertext. |
| Alguien te roba la laptop bloqueada | La `masterKey` ya se limpió por auto-lock. Necesita tu master password. |
| Alguien te roba la laptop desbloqueada y con vault abierto | Escenario real de riesgo. Contramedida: auto-lock corto + bloqueo manual. |
| Phishing de tu master password | Riesgo real. Contramedida: ser cuidadoso, TOTP en la cuenta Supabase, dominios sólo oficiales. |
| Extensión maliciosa del navegador | Riesgo real. Puede leer memoria/DOM. VaultHub no puede protegerte de eso — es límite del navegador. |

---

## 13. Resumen ultra corto

- **Servidor solo ve ciphertext + metadata no sensible.**
- **Master password vive solo en tu RAM.**
- **PBKDF2 600k iters + AES-256-GCM + RSA-OAEP 2048**, todo con Web Crypto API nativo.
- **RLS en todas las tablas** como segunda línea de defensa.
- **Perder la master password = vault perdido.** Por diseño, no es un bug.

Fin.
