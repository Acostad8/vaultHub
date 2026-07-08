// Sesiones activas y dispositivos confiables.
//
// Modelo: cada browser/instalacion se identifica con un UUID aleatorio
// persistido en localStorage (NO es dato sensible — es metadata operativa,
// equivalente a una cookie de dispositivo; permitido por las reglas del
// proyecto, que prohiben master key / datos descifrados, no identificadores).
//
// "Cierre remoto" funciona en dos capas:
//   1. supabase.auth.signOut({ scope: "others" }) revoca los refresh tokens
//      de TODAS las demas sesiones (nativo, sin service key).
//   2. Borrar el registro del dispositivo: ese cliente detecta en su
//      proximo heartbeat que fue revocado y hace signOut local.

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteDevice,
  findDeviceByFingerprint,
  listDevices,
  updateDevice,
  upsertDevice,
  type TrustedDeviceRow,
} from "@/repositories/trusted-devices";
import { logAudit } from "@/services/audit";

const DEVICE_ID_KEY = "vaulthub_device_id";

export type { TrustedDeviceRow };

export function getOrCreateDeviceFingerprint(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

// Nombre legible best-effort desde el user agent.
export function defaultDeviceName(): string {
  const ua = navigator.userAgent;
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad/i.test(ua)
        ? "iOS"
        : /Mac/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Desconocido";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\//i.test(ua)
      ? "Opera"
      : /Chrome\//i.test(ua)
        ? "Chrome"
        : /Firefox\//i.test(ua)
          ? "Firefox"
          : /Safari\//i.test(ua)
            ? "Safari"
            : "Navegador";
  return `${browser} en ${os}`;
}

/**
 * Registra (o refresca last_seen de) este dispositivo. Fire-and-forget
 * desde el flujo de unlock. Devuelve `revoked: true` si el registro fue
 * eliminado remotamente y este cliente debe cerrar sesion.
 */
export async function heartbeatCurrentDevice(): Promise<{ revoked: boolean }> {
  const fingerprint = getOrCreateDeviceFingerprint();
  const known = window.localStorage.getItem(`${DEVICE_ID_KEY}_registered`) === "1";

  const existing = await findDeviceByFingerprint(fingerprint);
  if (existing) {
    await upsertDevice({
      device_name: existing.device_name,
      device_fingerprint: fingerprint,
      user_agent: navigator.userAgent,
    });
    window.localStorage.setItem(`${DEVICE_ID_KEY}_registered`, "1");
    return { revoked: false };
  }

  if (known) {
    // Estuvo registrado y su fila ya no existe -> revocado remotamente.
    window.localStorage.removeItem(`${DEVICE_ID_KEY}_registered`);
    return { revoked: true };
  }

  await upsertDevice({
    device_name: defaultDeviceName(),
    device_fingerprint: fingerprint,
    user_agent: navigator.userAgent,
  });
  window.localStorage.setItem(`${DEVICE_ID_KEY}_registered`, "1");
  return { revoked: false };
}

export async function listMyDevices(): Promise<
  Array<TrustedDeviceRow & { is_current: boolean }>
> {
  const fingerprint = getOrCreateDeviceFingerprint();
  const rows = await listDevices();
  return rows.map((r) => ({ ...r, is_current: r.device_fingerprint === fingerprint }));
}

export async function renameDevice(id: string, name: string): Promise<void> {
  await updateDevice(id, { device_name: name });
}

export async function setDeviceTrusted(id: string, trusted: boolean): Promise<void> {
  await updateDevice(id, {
    is_trusted: trusted,
    // Trust expira a los 30 dias — politica conservadora por defecto.
    trusted_until: trusted
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null,
  });
  void logAudit(trusted ? "device_trust" : "device_revoke", { device_id: id });
}

export async function revokeDevice(id: string): Promise<void> {
  await deleteDevice(id);
  void logAudit("device_revoke", { device_id: id });
}

/** Revoca los refresh tokens de todas las demas sesiones de Supabase Auth. */
export async function signOutOtherSessions(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) throw error;
  void logAudit("device_revoke", { scope: "others" });
}
