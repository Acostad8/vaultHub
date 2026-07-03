// Acceso a la tabla profiles. Solo mueve datos — no hace crypto.

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  master_password_salt: string;
  kdf_iterations: number;
  auto_lock_minutes: number;
  last_unlock_at: string | null;
  verifier_ciphertext: string | null;
  verifier_iv: string | null;
  vault_initialized_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchMyProfile(): Promise<ProfileRow> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("profiles").select("*").single();
  if (error) throw error;
  return data as ProfileRow;
}

export async function saveVaultVerifier(params: {
  verifierCiphertext: string;
  verifierIv: string;
}): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      verifier_ciphertext: params.verifierCiphertext,
      verifier_iv: params.verifierIv,
      vault_initialized_at: new Date().toISOString(),
    })
    .eq("id", (await supabase.auth.getUser()).data.user!.id);
  if (error) throw error;
}

export async function touchLastUnlock(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("profiles")
    .update({ last_unlock_at: new Date().toISOString() })
    .eq("id", (await supabase.auth.getUser()).data.user!.id);
  if (error) throw error;
}
