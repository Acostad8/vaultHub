import { decryptPayload, encryptPayload } from "@/lib/crypto";
import {
  deleteCategory,
  insertCategory,
  listCategories,
  updateCategory,
  type CategoryRow,
} from "@/repositories/categories";
import { useVaultLock } from "@/store/vault-lock";

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
  const out: DecryptedCategory[] = [];
  for (const row of rows) {
    try {
      out.push(await decrypt(key, row));
    } catch {
      // skip corrupted
    }
  }
  return out;
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
  return decrypt(key, row);
}

export async function removeCategory(id: string): Promise<void> {
  await deleteCategory(id);
}
