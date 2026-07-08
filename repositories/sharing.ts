// Acceso a datos para compartir credenciales. Solo mueve datos — la
// criptografia (RSA/AES) vive en lib/crypto y services/sharing.

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { VaultItemType } from "@/types/vault";

export interface SharingKeysRow {
  sharing_public_key_jwk: JsonWebKey | null;
  sharing_private_key_ciphertext: string | null;
  sharing_private_key_iv: string | null;
}

export async function fetchMySharingKeys(): Promise<SharingKeysRow> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("sharing_public_key_jwk, sharing_private_key_ciphertext, sharing_private_key_iv")
    .single();
  if (error) throw error;
  return data as SharingKeysRow;
}

export async function saveMySharingKeys(params: {
  publicKeyJwk: JsonWebKey;
  privateKeyCiphertext: string;
  privateKeyIv: string;
}): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Sin sesion");
  const { error } = await supabase
    .from("profiles")
    .update({
      sharing_public_key_jwk: params.publicKeyJwk,
      sharing_private_key_ciphertext: params.privateKeyCiphertext,
      sharing_private_key_iv: params.privateKeyIv,
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function findRecipientByEmail(
  email: string,
): Promise<{ user_id: string; public_key_jwk: JsonWebKey } | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_sharing_recipient", {
    recipient_email: email,
  });
  if (error) throw error;
  const row = (data as Array<{ user_id: string; public_key_jwk: JsonWebKey }>)?.[0];
  return row ?? null;
}

export interface InsertShareInput {
  vault_item_id: string;
  shared_with_id: string;
  item_type: VaultItemType;
  encrypted_key_ciphertext: string;
  payload_ciphertext: string;
  payload_iv: string;
  expires_at: string | null;
}

export async function insertShare(input: InsertShareInput): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Sin sesion");
  const { error } = await supabase.from("shared_items").insert({
    owner_id: userId,
    permission: "read",
    ...input,
  });
  if (error) throw error;
}

export interface GivenShareRow {
  id: string;
  vault_item_id: string;
  recipient_email: string;
  permission: "read" | "write";
  expires_at: string | null;
  created_at: string;
}

export async function listGivenShares(vaultItemId?: string): Promise<GivenShareRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("list_given_shares", {
    p_vault_item_id: vaultItemId ?? null,
  });
  if (error) throw error;
  return (data ?? []) as GivenShareRow[];
}

export interface ReceivedShareRow {
  id: string;
  vault_item_id: string;
  owner_email: string;
  item_type: VaultItemType;
  permission: "read" | "write";
  encrypted_key_ciphertext: string;
  encrypted_key_iv: string | null;
  payload_ciphertext: string;
  payload_iv: string;
  expires_at: string | null;
  created_at: string;
}

export async function listReceivedShares(): Promise<ReceivedShareRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("list_received_shares");
  if (error) throw error;
  return (data ?? []) as ReceivedShareRow[];
}

export async function deleteShare(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("shared_items").delete().eq("id", id);
  if (error) throw error;
}
