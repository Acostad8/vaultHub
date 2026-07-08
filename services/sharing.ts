// Compartir credenciales Zero-Knowledge.
//
// Flujo (detallado en la migracion 20260708000002 y docs/CRYPTO_FLOW.md):
//   owner:       payload -> AES(K efimera) -> snapshot cifrado
//                K -> RSA-OAEP(publica destinatario) -> wrapped key
//   destinatario: privada <- AES-GCM(master key propia)
//                K <- unwrap(privada); payload <- AES(K)
//
// El share es un SNAPSHOT al momento de compartir. Cambios posteriores
// del owner no se propagan (re-compartir para actualizar). Solo permiso
// de lectura por ahora ('write' del enum queda reservado).

import {
  encryptPayload,
  decryptPayload,
  generateSharingKeyPair,
  generateShareItemKey,
  importSharingPrivateKey,
  importSharingPublicKey,
  unwrapShareKey,
  wrapShareKey,
} from "@/lib/crypto";
import {
  deleteShare,
  fetchMySharingKeys,
  findRecipientByEmail,
  insertShare,
  listGivenShares,
  listReceivedShares,
  saveMySharingKeys,
  type GivenShareRow,
  type ReceivedShareRow,
} from "@/repositories/sharing";
import { getDecryptedItem } from "@/services/vault-items";
import { logAudit } from "@/services/audit";
import { useVaultLock } from "@/store/vault-lock";
import type { VaultItemPayload } from "@/types/vault";

export type { GivenShareRow };

/**
 * Garantiza que el usuario tenga par de claves de compartir. Idempotente;
 * llamar tras el unlock (necesita la master key para cifrar la privada).
 */
export async function ensureSharingKeys(): Promise<void> {
  const existing = await fetchMySharingKeys();
  if (existing.sharing_public_key_jwk) return;
  const masterKey = useVaultLock.getState().requireKey();
  const pair = await generateSharingKeyPair(masterKey);
  await saveMySharingKeys({
    publicKeyJwk: pair.publicKeyJwk,
    privateKeyCiphertext: pair.privateKeyEncrypted.ciphertext,
    privateKeyIv: pair.privateKeyEncrypted.iv,
  });
}

export async function shareItem(params: {
  itemId: string;
  recipientEmail: string;
  expiresInDays: number | null;
}): Promise<void> {
  const recipient = await findRecipientByEmail(params.recipientEmail);
  if (!recipient) {
    throw new Error(
      "Destinatario no encontrado o aun sin claves de compartir (debe desbloquear su vault al menos una vez).",
    );
  }

  const item = await getDecryptedItem(params.itemId);
  if (!item) throw new Error("Item no encontrado");

  const itemKey = await generateShareItemKey();
  const snapshot = await encryptPayload(itemKey, item.payload);
  const recipientPublic = await importSharingPublicKey(recipient.public_key_jwk);
  const wrappedKey = await wrapShareKey(itemKey, recipientPublic);

  await insertShare({
    vault_item_id: item.id,
    shared_with_id: recipient.user_id,
    item_type: item.item_type,
    encrypted_key_ciphertext: wrappedKey,
    payload_ciphertext: snapshot.ciphertext,
    payload_iv: snapshot.iv,
    expires_at: params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null,
  });

  void logAudit("item_share", { item_id: item.id });
}

export async function revokeShare(shareId: string): Promise<void> {
  await deleteShare(shareId);
  void logAudit("item_unshare", { share_id: shareId });
}

export { listGivenShares };

export interface ReceivedShareDecrypted {
  id: string;
  owner_email: string;
  item_type: ReceivedShareRow["item_type"];
  payload: VaultItemPayload;
  expires_at: string | null;
  created_at: string;
}

export async function listReceivedSharesDecrypted(): Promise<ReceivedShareDecrypted[]> {
  const masterKey = useVaultLock.getState().requireKey();
  const keys = await fetchMySharingKeys();
  if (!keys.sharing_private_key_ciphertext || !keys.sharing_private_key_iv) {
    return []; // sin par de claves todavia -> nadie pudo compartirnos nada
  }
  const privateKey = await importSharingPrivateKey(masterKey, {
    ciphertext: keys.sharing_private_key_ciphertext,
    iv: keys.sharing_private_key_iv,
  });

  const rows = await listReceivedShares();
  const results: ReceivedShareDecrypted[] = [];
  for (const row of rows) {
    if (!row.payload_ciphertext || !row.payload_iv || !row.encrypted_key_ciphertext) continue;
    try {
      const itemKey = await unwrapShareKey(row.encrypted_key_ciphertext, privateKey);
      const payload = await decryptPayload<VaultItemPayload>(itemKey, {
        ciphertext: row.payload_ciphertext,
        iv: row.payload_iv,
      });
      results.push({
        id: row.id,
        owner_email: row.owner_email,
        item_type: row.item_type,
        payload,
        expires_at: row.expires_at,
        created_at: row.created_at,
      });
    } catch {
      // share corrupto o clave rotada: se omite en vez de romper la lista
    }
  }
  return results;
}

/** El destinatario quita el share de su vista (borra la fila — RLS lo permite). */
export async function dismissReceivedShare(shareId: string): Promise<void> {
  await deleteShare(shareId);
}
