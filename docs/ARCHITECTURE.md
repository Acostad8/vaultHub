# Arquitectura

## Vista general

```mermaid
flowchart TB
    subgraph Browser["Navegador (unico lugar con datos en claro)"]
        UI["UI (app/ + components/)"]
        SVC["services/ (orquestacion)"]
        REPO["repositories/ (queries)"]
        CRYPTO["lib/crypto/ (PBKDF2, AES-GCM, RSA-OAEP)"]
        STORE["store/ Zustand (master key SOLO en memoria)"]
        UI --> SVC
        SVC --> CRYPTO
        SVC --> REPO
        SVC --> STORE
    end

    subgraph Supabase["Supabase (solo ciphertext + metadata)"]
        AUTH["Auth (sesion, MFA TOTP)"]
        PG["PostgreSQL + RLS"]
        ST["Storage (adjuntos .enc)"]
    end

    REPO -->|"anon key + RLS"| PG
    REPO --> ST
    SVC --> AUTH

    PROXY["proxy.ts (Next) — gate de sesion via getClaims"] -.-> UI
```

Reglas duras:

- La UI **nunca** importa `lib/crypto/` ni el cliente Supabase — siempre via `services/`.
- `lib/crypto/` es puro: sin red, sin estado, 100% testeable (Vitest, 100+ tests).
- La master key vive solo en Zustand (memoria volátil). Auto-lock la limpia.

## Flujo de datos de un item

```mermaid
sequenceDiagram
    participant U as Usuario
    participant S as services/vault-items
    participant C as lib/crypto
    participant DB as Supabase (RLS)

    U->>S: crear item {payload}
    S->>C: encryptPayload(masterKey, payload)
    C-->>S: {ciphertext, iv}
    S->>DB: INSERT vault_items (ciphertext, iv, metadata)
    Note over DB: El server jamas ve el payload en claro
```

## Compartir E2E

```mermaid
sequenceDiagram
    participant O as Owner
    participant DB as Supabase
    participant R as Destinatario

    Note over O: descifra item con SU master key
    O->>O: K = AES-256 efimera
    O->>O: snapshot = AES(K, payload)
    O->>DB: get_sharing_recipient(email) -> publica de R
    O->>O: wrapped = RSA-OAEP(publica_R, K)
    O->>DB: INSERT shared_items (snapshot, wrapped)
    R->>DB: list_received_shares()
    R->>R: privada = AES-GCM_decrypt(master_R, privada_cifrada)
    R->>R: K = unwrap(privada, wrapped)
    R->>R: payload = AES_decrypt(K, snapshot)
```

## ERD

```mermaid
erDiagram
    profiles ||--o{ vault_items : "user_id"
    profiles ||--o{ categories : "user_id"
    profiles ||--o{ tags : "user_id"
    profiles ||--o{ trusted_devices : "user_id"
    profiles ||--o{ audit_log : "user_id"
    profiles ||--o{ attachments : "user_id"
    vault_items ||--o{ item_tags : "vault_item_id"
    tags ||--o{ item_tags : "tag_id"
    categories ||--o{ vault_items : "category_id"
    vault_items ||--o{ password_history : "vault_item_id"
    vault_items ||--o{ shared_items : "vault_item_id"
    vault_items ||--o{ attachments : "vault_item_id"
    profiles ||--o{ shared_items : "owner_id / shared_with_id"

    profiles {
        uuid id PK "= auth.users.id"
        text email
        text master_password_salt "publico, no secreto"
        int kdf_iterations ">= 600000"
        text verifier_ciphertext "valida master password"
        jsonb sharing_public_key_jwk "RSA publica"
        text sharing_private_key_ciphertext "RSA privada cifrada con master key"
    }
    vault_items {
        uuid id PK
        uuid user_id FK
        enum item_type "7 tipos"
        text payload_ciphertext "AES-256-GCM"
        text payload_iv
        uuid category_id FK
        bool is_favorite
        timestamptz deleted_at "soft delete"
    }
    shared_items {
        uuid id PK
        uuid owner_id FK
        uuid shared_with_id FK
        text encrypted_key_ciphertext "K envuelta RSA-OAEP"
        text payload_ciphertext "snapshot AES(K)"
        enum permission "read (write reservado)"
        timestamptz expires_at
    }
    attachments {
        uuid id PK
        text name_ciphertext "filename cifrado"
        text file_iv "IV del blob en Storage"
        bigint size_bytes
    }
    trusted_devices {
        uuid id PK
        text device_fingerprint "UUID client-side"
        bool is_trusted
        timestamptz trusted_until "30 dias"
    }
```

Todas las tablas con datos de usuario tienen **RLS own-only** (políticas comentadas en `supabase/migrations/`). Los joins que cruzan usuarios (emails en shares) van por RPCs `SECURITY DEFINER` que exponen lo mínimo.
