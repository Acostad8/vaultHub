import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface TrustedDeviceRow {
  id: string;
  user_id: string;
  device_name: string;
  device_fingerprint: string;
  user_agent: string | null;
  last_ip: string | null;
  is_trusted: boolean;
  trusted_until: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export async function upsertDevice(input: {
  device_name: string;
  device_fingerprint: string;
  user_agent: string | null;
}): Promise<TrustedDeviceRow> {
  const supabase = createSupabaseBrowserClient();
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) throw new Error("Sin sesion");

  const { data, error } = await supabase
    .from("trusted_devices")
    .upsert(
      {
        user_id: userId,
        device_name: input.device_name,
        device_fingerprint: input.device_fingerprint,
        user_agent: input.user_agent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_fingerprint" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as TrustedDeviceRow;
}

export async function listDevices(): Promise<TrustedDeviceRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("trusted_devices")
    .select("*")
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TrustedDeviceRow[];
}

export async function findDeviceByFingerprint(
  fingerprint: string,
): Promise<TrustedDeviceRow | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("trusted_devices")
    .select("*")
    .eq("device_fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw error;
  return (data as TrustedDeviceRow) ?? null;
}

export async function updateDevice(
  id: string,
  patch: Partial<Pick<TrustedDeviceRow, "device_name" | "is_trusted" | "trusted_until">>,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("trusted_devices").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteDevice(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("trusted_devices").delete().eq("id", id);
  if (error) throw error;
}
