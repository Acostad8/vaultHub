// Tipos compartidos del vault. El shape del payload cifrado por tipo de
// item se define aqui — los repositorios NO lo tocan (solo mueven bytes
// cifrados), pero services/vault-items.ts lo usa para validar tras
// descifrar.

export type VaultItemType = "password" | "note" | "api_key" | "ssh_key" | "card" | "identity" | "totp";

export interface PasswordPayload {
  name: string;
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
  totp_secret?: string;
  custom_fields?: Array<{ label: string; value: string }>;
}

export interface NotePayload {
  name: string;
  body: string;
}

export interface ApiKeyPayload {
  name: string;
  key: string;
  notes?: string;
}

export interface SshKeyPayload {
  name: string;
  private_key: string;
  public_key?: string;
  passphrase?: string;
  notes?: string;
}

export interface CardPayload {
  name: string;
  cardholder: string;
  number: string;
  exp_month: string;
  exp_year: string;
  cvv?: string;
  notes?: string;
}

export interface IdentityPayload {
  name: string;
  full_name?: string;
  document_number?: string;
  birth_date?: string;
  address?: string;
  notes?: string;
}

export interface TotpPayload {
  name: string;
  secret: string;
  issuer?: string;
  digits?: 6 | 7 | 8;
  period?: number;
}

export type VaultItemPayload =
  | PasswordPayload
  | NotePayload
  | ApiKeyPayload
  | SshKeyPayload
  | CardPayload
  | IdentityPayload
  | TotpPayload;

// Fila cifrada tal cual esta en DB.
export interface VaultItemRow {
  id: string;
  user_id: string;
  item_type: VaultItemType;
  category_id: string | null;
  payload_ciphertext: string;
  payload_iv: string;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Item con payload descifrado, usado en UI.
export interface VaultItemDecrypted<T extends VaultItemPayload = VaultItemPayload> {
  id: string;
  item_type: VaultItemType;
  category_id: string | null;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  payload: T;
}
