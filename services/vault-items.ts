// Servicios de vault_items — orquesta crypto + repositorio.

import { decryptPayload, encryptPayload } from "@/lib/crypto";
import {
  insertVaultItem,
  listActiveVaultItems,
  listPasswordHistory,
  listTrashedVaultItems,
  purgeVaultItem,
  restoreVaultItem,
  softDeleteVaultItem,
  updateVaultItem,
  getVaultItem,
  type PasswordHistoryRow,
} from "@/repositories/vault-items";
import type { VaultItemDecrypted, VaultItemPayload, VaultItemRow, VaultItemType } from "@/types/vault";
import { useVaultLock } from "@/store/vault-lock";
import { logAudit } from "@/services/audit";

function decryptedFromRow<T extends VaultItemPayload>(
  row: VaultItemRow,
  payload: T,
): VaultItemDecrypted<T> {
  return {
    id: row.id,
    item_type: row.item_type,
    category_id: row.category_id,
    is_favorite: row.is_favorite,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    payload,
  };
}

async function decryptRow(key: CryptoKey, row: VaultItemRow): Promise<VaultItemDecrypted | null> {
  try {
    const payload = await decryptPayload<VaultItemPayload>(key, {
      ciphertext: row.payload_ciphertext,
      iv: row.payload_iv,
    });
    return decryptedFromRow(row, payload);
  } catch {
    return null;
  }
}

export async function listDecryptedItems(): Promise<VaultItemDecrypted[]> {
  const key = useVaultLock.getState().requireKey();
  const rows = await listActiveVaultItems();
  const decrypted = await Promise.all(rows.map((row) => decryptRow(key, row)));
  return decrypted.filter((it): it is VaultItemDecrypted => it !== null);
}

export async function listDecryptedTrash(): Promise<VaultItemDecrypted[]> {
  const key = useVaultLock.getState().requireKey();
  const rows = await listTrashedVaultItems();
  const decrypted = await Promise.all(rows.map((row) => decryptRow(key, row)));
  return decrypted.filter((it): it is VaultItemDecrypted => it !== null);
}

export async function getDecryptedItem(id: string): Promise<VaultItemDecrypted | null> {
  const key = useVaultLock.getState().requireKey();
  const row = await getVaultItem(id);
  if (!row) return null;
  const payload = await decryptPayload<VaultItemPayload>(key, {
    ciphertext: row.payload_ciphertext,
    iv: row.payload_iv,
  });
  return decryptedFromRow(row, payload);
}

export async function createItem(params: {
  item_type: VaultItemType;
  payload: VaultItemPayload;
  category_id?: string | null;
  is_favorite?: boolean;
}): Promise<VaultItemDecrypted> {
  const key = useVaultLock.getState().requireKey();
  const envelope = await encryptPayload(key, params.payload);
  const row = await insertVaultItem({
    item_type: params.item_type,
    category_id: params.category_id ?? null,
    payload_ciphertext: envelope.ciphertext,
    payload_iv: envelope.iv,
    is_favorite: params.is_favorite,
  });
  void logAudit("item_create", { id: row.id, item_type: params.item_type });
  return decryptedFromRow(row, params.payload);
}

export async function editItem(params: {
  id: string;
  payload?: VaultItemPayload;
  category_id?: string | null;
  is_favorite?: boolean;
}): Promise<VaultItemDecrypted> {
  const key = useVaultLock.getState().requireKey();
  let cipher: { payload_ciphertext?: string; payload_iv?: string } = {};
  if (params.payload) {
    const envelope = await encryptPayload(key, params.payload);
    cipher = { payload_ciphertext: envelope.ciphertext, payload_iv: envelope.iv };
  }
  const row = await updateVaultItem({
    id: params.id,
    ...cipher,
    category_id: params.category_id,
    is_favorite: params.is_favorite,
  });
  const payload =
    params.payload ??
    (await decryptPayload<VaultItemPayload>(key, {
      ciphertext: row.payload_ciphertext,
      iv: row.payload_iv,
    }));
  void logAudit("item_update", { id: params.id });
  return decryptedFromRow(row, payload);
}

export async function toggleFavorite(id: string, next: boolean): Promise<void> {
  await updateVaultItem({ id, is_favorite: next });
}

export async function trashItem(id: string): Promise<void> {
  await softDeleteVaultItem(id);
  void logAudit("item_delete", { id, kind: "trash" });
}

export async function restoreItem(id: string): Promise<void> {
  await restoreVaultItem(id);
  void logAudit("item_restore", { id });
}

export async function purgeItem(id: string): Promise<void> {
  await purgeVaultItem(id);
  void logAudit("item_delete", { id, kind: "purge" });
}

export interface DecryptedHistoryEntry {
  id: string;
  archived_at: string;
  payload: VaultItemPayload;
}

export async function listDecryptedPasswordHistory(vaultItemId: string): Promise<DecryptedHistoryEntry[]> {
  const key = useVaultLock.getState().requireKey();
  const rows = await listPasswordHistory(vaultItemId);
  const decrypted = await Promise.all(
    rows.map(async (row): Promise<DecryptedHistoryEntry | null> => {
      try {
        const payload = await decryptPayload<VaultItemPayload>(key, {
          ciphertext: row.payload_ciphertext,
          iv: row.payload_iv,
        });
        return { id: row.id, archived_at: row.archived_at, payload };
      } catch {
        return null;
      }
    }),
  );
  return decrypted.filter((it): it is DecryptedHistoryEntry => it !== null);
}

export type { PasswordHistoryRow };
