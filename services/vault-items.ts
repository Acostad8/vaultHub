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
  const out: VaultItemDecrypted[] = [];
  for (const row of rows) {
    const dec = await decryptRow(key, row);
    if (dec) out.push(dec);
  }
  return out;
}

export async function listDecryptedTrash(): Promise<VaultItemDecrypted[]> {
  const key = useVaultLock.getState().requireKey();
  const rows = await listTrashedVaultItems();
  const out: VaultItemDecrypted[] = [];
  for (const row of rows) {
    const dec = await decryptRow(key, row);
    if (dec) out.push(dec);
  }
  return out;
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
  return decryptedFromRow(row, payload);
}

export async function toggleFavorite(id: string, next: boolean): Promise<void> {
  await updateVaultItem({ id, is_favorite: next });
}

export async function trashItem(id: string): Promise<void> {
  await softDeleteVaultItem(id);
}

export async function restoreItem(id: string): Promise<void> {
  await restoreVaultItem(id);
}

export async function purgeItem(id: string): Promise<void> {
  await purgeVaultItem(id);
}

export interface DecryptedHistoryEntry {
  id: string;
  archived_at: string;
  payload: VaultItemPayload;
}

export async function listDecryptedPasswordHistory(vaultItemId: string): Promise<DecryptedHistoryEntry[]> {
  const key = useVaultLock.getState().requireKey();
  const rows = await listPasswordHistory(vaultItemId);
  const out: DecryptedHistoryEntry[] = [];
  for (const row of rows) {
    try {
      const payload = await decryptPayload<VaultItemPayload>(key, {
        ciphertext: row.payload_ciphertext,
        iv: row.payload_iv,
      });
      out.push({ id: row.id, archived_at: row.archived_at, payload });
    } catch {
      // skip
    }
  }
  return out;
}

export type { PasswordHistoryRow };
