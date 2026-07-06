import { decryptPayload, encryptPayload } from "@/lib/crypto";
import { deleteTag, insertTag, listTags, updateTag, type TagRow } from "@/repositories/tags";
import { setItemTags, listItemTags } from "@/repositories/item-tags";
import { useVaultLock } from "@/store/vault-lock";

export interface DecryptedTag {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

async function decrypt(key: CryptoKey, row: TagRow): Promise<DecryptedTag> {
  const name = await decryptPayload<string>(key, {
    ciphertext: row.name_ciphertext,
    iv: row.name_iv,
  });
  return {
    id: row.id,
    name,
    color: row.color,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listDecryptedTags(): Promise<DecryptedTag[]> {
  const key = useVaultLock.getState().requireKey();
  const rows = await listTags();
  const decrypted = await Promise.all(
    rows.map(async (row) => {
      try {
        return await decrypt(key, row);
      } catch {
        return null;
      }
    }),
  );
  return decrypted.filter((it): it is DecryptedTag => it !== null);
}

export async function createTag(params: { name: string; color?: string | null }): Promise<DecryptedTag> {
  const key = useVaultLock.getState().requireKey();
  const envelope = await encryptPayload(key, params.name);
  const row = await insertTag({
    name_ciphertext: envelope.ciphertext,
    name_iv: envelope.iv,
    color: params.color ?? null,
  });
  return decrypt(key, row);
}

export async function renameTag(id: string, name: string): Promise<DecryptedTag> {
  const key = useVaultLock.getState().requireKey();
  const envelope = await encryptPayload(key, name);
  const row = await updateTag({
    id,
    name_ciphertext: envelope.ciphertext,
    name_iv: envelope.iv,
  });
  return decrypt(key, row);
}

export async function removeTag(id: string): Promise<void> {
  await deleteTag(id);
}

export async function assignTagsToItem(vaultItemId: string, tagIds: string[]): Promise<void> {
  await setItemTags(vaultItemId, tagIds);
}

/** Map de vaultItemId -> tagIds[]. Util para el listado. */
export async function fetchItemTagsMap(): Promise<Map<string, string[]>> {
  const rows = await listItemTags();
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const existing = map.get(row.vault_item_id) ?? [];
    existing.push(row.tag_id);
    map.set(row.vault_item_id, existing);
  }
  return map;
}
