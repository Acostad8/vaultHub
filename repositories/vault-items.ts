// Acceso a vault_items. Solo mueve ciphertext + metadata no sensible.
// Ningun descifrado ocurre aqui.

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { VaultItemRow, VaultItemType } from "@/types/vault";

export interface CreateVaultItemInput {
  item_type: VaultItemType;
  category_id?: string | null;
  payload_ciphertext: string;
  payload_iv: string;
  is_favorite?: boolean;
}

export interface UpdateVaultItemInput {
  id: string;
  payload_ciphertext?: string;
  payload_iv?: string;
  category_id?: string | null;
  is_favorite?: boolean;
}

export async function listActiveVaultItems(): Promise<VaultItemRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("vault_items")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VaultItemRow[];
}

export async function getVaultItem(id: string): Promise<VaultItemRow | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("vault_items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as VaultItemRow | null;
}

export async function insertVaultItem(input: CreateVaultItemInput): Promise<VaultItemRow> {
  const supabase = createSupabaseBrowserClient();
  const userId = (await supabase.auth.getUser()).data.user!.id;
  const { data, error } = await supabase
    .from("vault_items")
    .insert({
      user_id: userId,
      item_type: input.item_type,
      category_id: input.category_id ?? null,
      payload_ciphertext: input.payload_ciphertext,
      payload_iv: input.payload_iv,
      is_favorite: input.is_favorite ?? false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as VaultItemRow;
}

export async function updateVaultItem(input: UpdateVaultItemInput): Promise<VaultItemRow> {
  const supabase = createSupabaseBrowserClient();
  const patch: Record<string, unknown> = {};
  if (input.payload_ciphertext !== undefined) patch.payload_ciphertext = input.payload_ciphertext;
  if (input.payload_iv !== undefined) patch.payload_iv = input.payload_iv;
  if (input.category_id !== undefined) patch.category_id = input.category_id;
  if (input.is_favorite !== undefined) patch.is_favorite = input.is_favorite;

  const { data, error } = await supabase
    .from("vault_items")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as VaultItemRow;
}

export async function softDeleteVaultItem(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("vault_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
