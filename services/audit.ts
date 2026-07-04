// Wrapper conveniente para insertar eventos de auditoria sin bloquear el
// flow principal. Nunca lanza — un fallo de audit no debe romper la
// operacion que se esta auditando.

import { insertAuditLog, type AuditAction } from "@/repositories/audit-log";

export async function logAudit(
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await insertAuditLog({ action, metadata });
  } catch {
    // Silent: audit es fire-and-forget. Un usuario sin sesion, RLS que
    // niega, o problema de red no debe cascadear a la UX.
  }
}
