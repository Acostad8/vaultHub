// Export / import de backup en JSON cifrado.
//
// Formato (documentado en docs/CRYPTO_FLOW.md):
//   {
//     "version": 1,
//     "kdf": { "algo": "PBKDF2-SHA256", "iterations": N, "salt": "<base64>" },
//     "cipher": { "algo": "AES-256-GCM", "iv": "<base64>", "ciphertext": "<base64>" }
//   }
//
// Ciphertext = JSON del vault entero (items descifrados + categorias +
// tags) cifrado con una clave derivada por PBKDF2 desde una password de
// backup (puede ser la master password u otra distinta — el flujo lo
// deja abierto).

import {
  deriveMasterKey,
  encryptPayload,
  decryptPayload,
  generateSaltBase64,
  PBKDF2_DEFAULT_ITERATIONS,
} from "@/lib/crypto";
import { listDecryptedItems, createItem } from "@/services/vault-items";
import { listDecryptedCategories, createCategory } from "@/services/categories";
import { listDecryptedTags, createTag, assignTagsToItem, fetchItemTagsMap } from "@/services/tags";
import { logAudit } from "@/services/audit";
import type { VaultItemDecrypted, VaultItemType, VaultItemPayload } from "@/types/vault";

export interface BackupItem {
  item_type: VaultItemType;
  category_name: string | null;
  tag_names: string[];
  is_favorite: boolean;
  payload: VaultItemPayload;
}

export interface BackupPlaintext {
  exported_at: string;
  items: BackupItem[];
  categories: Array<{ name: string; color: string | null }>;
  tags: Array<{ name: string; color: string | null }>;
}

export interface EncryptedBackup {
  version: 1;
  kdf: { algo: "PBKDF2-SHA256"; iterations: number; salt: string };
  cipher: { algo: "AES-256-GCM"; iv: string; ciphertext: string };
}

// ---------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------

export async function exportBackup(backupPassword: string): Promise<EncryptedBackup> {
  const [items, categories, tags, tagMap] = await Promise.all([
    listDecryptedItems(),
    listDecryptedCategories(),
    listDecryptedTags(),
    fetchItemTagsMap(),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const tagNameById = new Map(tags.map((t) => [t.id, t.name]));

  const backupItems: BackupItem[] = items.map((it) => ({
    item_type: it.item_type,
    category_name: it.category_id ? categoryNameById.get(it.category_id) ?? null : null,
    tag_names: (tagMap.get(it.id) ?? [])
      .map((tid) => tagNameById.get(tid))
      .filter((n): n is string => typeof n === "string"),
    is_favorite: it.is_favorite,
    payload: it.payload,
  }));

  const plaintext: BackupPlaintext = {
    exported_at: new Date().toISOString(),
    items: backupItems,
    categories: categories.map((c) => ({ name: c.name, color: c.color })),
    tags: tags.map((t) => ({ name: t.name, color: t.color })),
  };

  const salt = generateSaltBase64();
  const iterations = PBKDF2_DEFAULT_ITERATIONS;
  const key = await deriveMasterKey({
    password: backupPassword,
    saltBase64: salt,
    iterations,
  });

  const envelope = await encryptPayload(key, plaintext);

  void logAudit("export", { items: items.length });

  return {
    version: 1,
    kdf: { algo: "PBKDF2-SHA256", iterations, salt },
    cipher: { algo: "AES-256-GCM", iv: envelope.iv, ciphertext: envelope.ciphertext },
  };
}

// ---------------------------------------------------------------------
// IMPORT
// ---------------------------------------------------------------------

export interface ImportSummary {
  itemsImported: number;
  categoriesCreated: number;
  tagsCreated: number;
}

function isEncryptedBackup(v: unknown): v is EncryptedBackup {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.version !== 1) return false;
  const kdf = o.kdf as Record<string, unknown> | undefined;
  const cipher = o.cipher as Record<string, unknown> | undefined;
  if (!kdf || !cipher) return false;
  return (
    typeof kdf.iterations === "number" &&
    typeof kdf.salt === "string" &&
    typeof cipher.iv === "string" &&
    typeof cipher.ciphertext === "string"
  );
}

// Descifra un backup SOLO en memoria, sin escribir nada en el vault.
// Base de la vista previa y del import.
export async function previewBackup(
  backupJson: unknown,
  backupPassword: string,
): Promise<BackupPlaintext> {
  if (!isEncryptedBackup(backupJson)) {
    throw new Error("Formato de backup no valido");
  }

  const key = await deriveMasterKey({
    password: backupPassword,
    saltBase64: backupJson.kdf.salt,
    iterations: backupJson.kdf.iterations,
  });

  try {
    return await decryptPayload<BackupPlaintext>(key, {
      ciphertext: backupJson.cipher.ciphertext,
      iv: backupJson.cipher.iv,
    });
  } catch {
    throw new Error("Password del backup incorrecta o backup corrupto");
  }
}

export async function importBackup(
  backupJson: unknown,
  backupPassword: string,
): Promise<ImportSummary> {
  const plaintext = await previewBackup(backupJson, backupPassword);

  // Categorias primero — reused by items
  const [existingCats, existingTags] = await Promise.all([
    listDecryptedCategories(),
    listDecryptedTags(),
  ]);
  const catIdByName = new Map(existingCats.map((c) => [c.name, c.id]));
  const tagIdByName = new Map(existingTags.map((t) => [t.name, t.id]));

  let categoriesCreated = 0;
  for (const c of plaintext.categories ?? []) {
    if (catIdByName.has(c.name)) continue;
    const created = await createCategory({ name: c.name, color: c.color });
    catIdByName.set(c.name, created.id);
    categoriesCreated += 1;
  }

  let tagsCreated = 0;
  for (const t of plaintext.tags ?? []) {
    if (tagIdByName.has(t.name)) continue;
    const created = await createTag({ name: t.name, color: t.color });
    tagIdByName.set(t.name, created.id);
    tagsCreated += 1;
  }

  let itemsImported = 0;
  for (const it of plaintext.items ?? []) {
    const catId = it.category_name ? catIdByName.get(it.category_name) ?? null : null;
    const created = await createItem({
      item_type: it.item_type,
      payload: it.payload,
      category_id: catId,
      is_favorite: it.is_favorite,
    });
    const tagIds = it.tag_names
      .map((n) => tagIdByName.get(n))
      .filter((id): id is string => typeof id === "string");
    if (tagIds.length > 0) {
      await assignTagsToItem(created.id, tagIds);
    }
    itemsImported += 1;
  }

  void logAudit("import", {
    items: itemsImported,
    categories: categoriesCreated,
    tags: tagsCreated,
  });

  return { itemsImported, categoriesCreated, tagsCreated };
}

// Helper: trigger download del backup como archivo JSON.
export function downloadBackup(backup: EncryptedBackup, filename?: string): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = filename ?? `vaulthub-backup-${stamp}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Tipo publico de VaultItemDecrypted re-exportado por conveniencia.
export type { VaultItemDecrypted };
