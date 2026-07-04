import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AuditAction =
  | "login"
  | "logout"
  | "vault_unlock"
  | "vault_lock"
  | "item_create"
  | "item_update"
  | "item_delete"
  | "item_restore"
  | "item_share"
  | "item_unshare"
  | "export"
  | "import"
  | "password_change"
  | "device_trust"
  | "device_revoke";

export interface AuditLogRow {
  id: string;
  user_id: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface InsertAuditLogInput {
  action: AuditAction;
  metadata?: Record<string, unknown>;
}

export async function insertAuditLog(input: InsertAuditLogInput): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) return; // sin sesion, skip silent

  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

  const { error } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: input.action,
    metadata: input.metadata ?? {},
    user_agent: userAgent,
    // ip_address: server-side idealmente. Aqui se deja NULL — el cliente
    // no puede autenticarla y la que reporte seria falseable.
  });
  if (error) throw error;
}

export async function listRecentAuditLogs(limit = 100): Promise<AuditLogRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditLogRow[];
}
