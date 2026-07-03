import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface ItemTagRow {
  vault_item_id: string;
  tag_id: string;
  user_id: string;
  created_at: string;
}

export async function listItemTags(): Promise<ItemTagRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("item_tags").select("*");
  if (error) throw error;
  return (data ?? []) as ItemTagRow[];
}

export async function setItemTags(vaultItemId: string, tagIds: string[]): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const userId = (await supabase.auth.getUser()).data.user!.id;

  // Diff simple: borra todos y reinserta. Simpler than compute delta.
  // Como el volumen por item es pequeño (usualmente < 10 tags), es aceptable.
  const { error: delErr } = await supabase.from("item_tags").delete().eq("vault_item_id", vaultItemId);
  if (delErr) throw delErr;
  if (tagIds.length === 0) return;

  const rows = tagIds.map((tag_id) => ({
    vault_item_id: vaultItemId,
    tag_id,
    user_id: userId,
  }));
  const { error: insErr } = await supabase.from("item_tags").insert(rows);
  if (insErr) throw insErr;
}
