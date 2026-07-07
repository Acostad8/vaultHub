import { decryptPayload, encryptPayload } from "@/lib/crypto";
import {
  deleteCategory,
  insertCategory,
  listCategories,
  updateCategory,
  type CategoryRow,
} from "@/repositories/categories";
import { useVaultLock } from "@/store/vault-lock";
import { useVaultCache } from "@/store/vault-cache";

export interface DecryptedCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

async function decrypt(key: CryptoKey, row: CategoryRow): Promise<DecryptedCategory> {
  const name = await decryptPayload<string>(key, {
    ciphertext: row.name_ciphertext,
    iv: row.name_iv,
  });
  return {
    id: row.id,
    name,
    icon: row.icon,
    color: row.color,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listDecryptedCategories(): Promise<DecryptedCategory[]> {
  const key = useVaultLock.getState().requireKey();
  const rows = await listCategories();
  const decrypted = await Promise.all(
    rows.map(async (row) => {
      try {
        return await decrypt(key, row);
      } catch {
        return null;
      }
    }),
  );
  return decrypted.filter((it): it is DecryptedCategory => it !== null);
}

export async function createCategory(params: {
  name: string;
  icon?: string | null;
  color?: string | null;
}): Promise<DecryptedCategory> {
  const key = useVaultLock.getState().requireKey();
  const envelope = await encryptPayload(key, params.name);
  const row = await insertCategory({
    name_ciphertext: envelope.ciphertext,
    name_iv: envelope.iv,
    icon: params.icon ?? null,
    color: params.color ?? null,
  });
  useVaultCache.getState().invalidateCategories();
  return decrypt(key, row);
}

export async function renameCategory(id: string, name: string): Promise<DecryptedCategory> {
  const key = useVaultLock.getState().requireKey();
  const envelope = await encryptPayload(key, name);
  const row = await updateCategory({
    id,
    name_ciphertext: envelope.ciphertext,
    name_iv: envelope.iv,
  });
  useVaultCache.getState().invalidateCategories();
  return decrypt(key, row);
}

export async function removeCategory(id: string): Promise<void> {
  await deleteCategory(id);
  useVaultCache.getState().invalidateCategories();
}
