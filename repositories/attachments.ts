import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const BUCKET = "encrypted-attachments";

export interface AttachmentRow {
  id: string;
  user_id: string;
  vault_item_id: string;
  name_ciphertext: string;
  name_iv: string;
  file_iv: string;
  size_bytes: number;
  created_at: string;
}

function storagePath(userId: string, itemId: string, attachmentId: string): string {
  return `${userId}/${itemId}/${attachmentId}.enc`;
}

export async function insertAttachment(input: {
  vault_item_id: string;
  name_ciphertext: string;
  name_iv: string;
  file_iv: string;
  size_bytes: number;
  encryptedBlob: Uint8Array;
}): Promise<AttachmentRow> {
  const supabase = createSupabaseBrowserClient();
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) throw new Error("Sin sesion");

  const { data, error } = await supabase
    .from("attachments")
    .insert({
      user_id: userId,
      vault_item_id: input.vault_item_id,
      name_ciphertext: input.name_ciphertext,
      name_iv: input.name_iv,
      file_iv: input.file_iv,
      size_bytes: input.size_bytes,
    })
    .select()
    .single();
  if (error) throw error;
  const row = data as AttachmentRow;

  const path = storagePath(userId, input.vault_item_id, row.id);
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([input.encryptedBlob as BlobPart], { type: "application/octet-stream" }), {
      contentType: "application/octet-stream",
      upsert: false,
    });
  if (upload.error) {
    // rollback metadata si el blob no subio — no dejar filas huerfanas
    await supabase.from("attachments").delete().eq("id", row.id);
    throw upload.error;
  }
  return row;
}

export async function listAttachments(vaultItemId: string): Promise<AttachmentRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("vault_item_id", vaultItemId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AttachmentRow[];
}

export async function downloadAttachmentBlob(row: AttachmentRow): Promise<Uint8Array> {
  const supabase = createSupabaseBrowserClient();
  const path = storagePath(row.user_id, row.vault_item_id, row.id);
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  return new Uint8Array(await data.arrayBuffer());
}

export async function deleteAttachment(row: AttachmentRow): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const path = storagePath(row.user_id, row.vault_item_id, row.id);
  const removal = await supabase.storage.from(BUCKET).remove([path]);
  if (removal.error) throw removal.error;
  const { error } = await supabase.from("attachments").delete().eq("id", row.id);
  if (error) throw error;
}
