// Adjuntos cifrados Zero-Knowledge.
//
// El archivo se cifra completo con AES-256-GCM y la master key ANTES de
// salir del navegador. El nombre original tambien se cifra (puede revelar
// contenido). Supabase Storage solo recibe un blob opaco .enc.
// Limite del bucket: 20 MB por archivo (enforced server-side).

import { base64ToBytes, bytesToBase64, decryptBytes, encryptBytes } from "@/lib/crypto";
import {
  deleteAttachment,
  downloadAttachmentBlob,
  insertAttachment,
  listAttachments,
  type AttachmentRow,
} from "@/repositories/attachments";
import { useVaultLock } from "@/store/vault-lock";
import { logAudit } from "@/services/audit";

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export interface AttachmentDecrypted {
  row: AttachmentRow;
  filename: string;
  size_bytes: number;
  created_at: string;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function uploadAttachment(
  vaultItemId: string,
  file: File,
): Promise<AttachmentDecrypted> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Archivo supera el limite de 20 MB");
  }
  const key = useVaultLock.getState().requireKey();

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const fileEnvelope = await encryptBytes(key, fileBytes);
  const nameEnvelope = await encryptBytes(key, textEncoder.encode(file.name));

  const row = await insertAttachment({
    vault_item_id: vaultItemId,
    name_ciphertext: nameEnvelope.ciphertext,
    name_iv: nameEnvelope.iv,
    file_iv: fileEnvelope.iv,
    size_bytes: file.size,
    encryptedBlob: base64ToBytes(fileEnvelope.ciphertext),
  });

  void logAudit("item_update", { attachment: "upload", item_id: vaultItemId });
  return { row, filename: file.name, size_bytes: file.size, created_at: row.created_at };
}

export async function listDecryptedAttachments(
  vaultItemId: string,
): Promise<AttachmentDecrypted[]> {
  const key = useVaultLock.getState().requireKey();
  const rows = await listAttachments(vaultItemId);
  return Promise.all(
    rows.map(async (row) => {
      const nameBytes = await decryptBytes(key, {
        ciphertext: row.name_ciphertext,
        iv: row.name_iv,
      });
      return {
        row,
        filename: textDecoder.decode(nameBytes),
        size_bytes: row.size_bytes,
        created_at: row.created_at,
      };
    }),
  );
}

/** Descarga, descifra en memoria y dispara el download del archivo original. */
export async function downloadAndDecryptAttachment(att: AttachmentDecrypted): Promise<void> {
  const key = useVaultLock.getState().requireKey();
  const encryptedBytes = await downloadAttachmentBlob(att.row);
  const plainBytes = await decryptBytes(key, {
    ciphertext: bytesToBase64(encryptedBytes),
    iv: att.row.file_iv,
  });

  const blob = new Blob([plainBytes as BlobPart]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = att.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function removeAttachment(att: AttachmentDecrypted): Promise<void> {
  await deleteAttachment(att.row);
  void logAudit("item_update", { attachment: "delete", item_id: att.row.vault_item_id });
}
