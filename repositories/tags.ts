import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface TagRow {
  id: string;
  user_id: string;
  name_ciphertext: string;
  name_iv: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export async function listTags(): Promise<TagRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("tags").select("*");
  if (error) throw error;
  return (data ?? []) as TagRow[];
}

export async function insertTag(input: {
  name_ciphertext: string;
  name_iv: string;
  color?: string | null;
}): Promise<TagRow> {
  const supabase = createSupabaseBrowserClient();
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data, error } = await supabase
    .from("tags")
    .insert({
      user_id: userId,
      name_ciphertext: input.name_ciphertext,
      name_iv: input.name_iv,
      color: input.color ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as TagRow;
}

export async function updateTag(input: {
  id: string;
  name_ciphertext?: string;
  name_iv?: string;
  color?: string | null;
}): Promise<TagRow> {
  const supabase = createSupabaseBrowserClient();
  const patch: Record<string, unknown> = {};
  if (input.name_ciphertext !== undefined) patch.name_ciphertext = input.name_ciphertext;
  if (input.name_iv !== undefined) patch.name_iv = input.name_iv;
  if (input.color !== undefined) patch.color = input.color;
  const { data, error } = await supabase
    .from("tags")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as TagRow;
}

export async function deleteTag(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
}
