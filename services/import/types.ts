// Formato neutro al que los parsers de terceros convierten.
// El wizard de import consume `ImportedItem[]` y llama a createItem() por
// cada uno tras confirmar. Nada aquí toca red — parsers puros.

import type { VaultItemPayload, VaultItemType } from "@/types/vault";

export interface ImportedItem {
  item_type: VaultItemType;
  // Nombre de categoría original (opcional). El wizard la reutiliza si existe.
  category_name?: string | null;
  tag_names?: string[];
  is_favorite?: boolean;
  payload: VaultItemPayload;
}

export interface ImportResult {
  items: ImportedItem[];
  // Métricas útiles para el preview.
  skipped: number;
  reasons: string[];
}

export type ImportSource = "bitwarden" | "1password" | "lastpass" | "chrome";

export interface ImportSourceMeta {
  id: ImportSource;
  label: string;
  format: "json" | "csv" | "1pif" | "json+csv";
  accept: string;
  description: string;
}

export const IMPORT_SOURCES: ImportSourceMeta[] = [
  {
    id: "bitwarden",
    label: "Bitwarden",
    format: "json",
    accept: ".json,application/json",
    description: "Export sin cifrar (Tools → Export vault → File format: json)",
  },
  {
    id: "1password",
    label: "1Password",
    format: "1pif",
    accept: ".1pif,.csv,text/csv,application/json",
    description: "Export .1pif (formato clásico) o CSV",
  },
  {
    id: "lastpass",
    label: "LastPass",
    format: "csv",
    accept: ".csv,text/csv",
    description: "Export CSV desde More Options → Advanced → Export",
  },
  {
    id: "chrome",
    label: "Chrome / Edge / navegadores",
    format: "csv",
    accept: ".csv,text/csv",
    description: "Passwords → ⋮ → Export passwords (name,url,username,password)",
  },
];
