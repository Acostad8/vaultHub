import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface CategoryRow {
  id: string;
  user_id: string;
  name_ciphertext: string;
  name_iv: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  name_ciphertext: string;
  name_iv: string;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
}

export interface UpdateCategoryInput {
  id: string;
  name_ciphertext?: string;
  name_iv?: string;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
}

export async function listCategories(): Promise<CategoryRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

export async function insertCategory(input: CreateCategoryInput): Promise<CategoryRow> {
  const supabase = createSupabaseBrowserClient();
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name_ciphertext: input.name_ciphertext,
      name_iv: input.name_iv,
      icon: input.icon ?? null,
      color: input.color ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CategoryRow;
}

export async function updateCategory(input: UpdateCategoryInput): Promise<CategoryRow> {
  const supabase = createSupabaseBrowserClient();
  const patch: Record<string, unknown> = {};
  if (input.name_ciphertext !== undefined) patch.name_ciphertext = input.name_ciphertext;
  if (input.name_iv !== undefined) patch.name_iv = input.name_iv;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.color !== undefined) patch.color = input.color;
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as CategoryRow;
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
