// Parametros criptograficos fijos del proyecto. Cambiarlos tiene impacto
// en compatibilidad con vaults existentes — leer docs/CRYPTO_FLOW.md antes.

// PBKDF2: minimo permitido por OWASP 2023 para SHA-256. Se puede subir sin
// romper vaults existentes porque cada profile guarda su propia cuenta de
// iteraciones (kdf_iterations en profiles). El valor default se usa solo
// al REGISTRAR nuevos usuarios.
export const PBKDF2_DEFAULT_ITERATIONS = 600_000 as const;
export const PBKDF2_MIN_ITERATIONS = 600_000 as const;
export const PBKDF2_HASH = "SHA-256" as const;

// AES-256-GCM. Tamano fijo por RFC 5116.
export const AES_KEY_BITS = 256 as const;
export const AES_ALGORITHM = "AES-GCM" as const;

// IV recomendado para GCM: 12 bytes (96 bits). Cualquier otro tamano es
// procesable pero degrada el margen de seguridad y no gana nada.
export const AES_IV_BYTES = 12 as const;

// Salt PBKDF2: 32 bytes = 256 bits. Publico por naturaleza (vive en la DB
// en claro) pero debe ser aleatorio y unico por usuario.
export const PBKDF2_SALT_BYTES = 32 as const;
