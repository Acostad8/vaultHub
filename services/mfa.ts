// 2FA de cuenta via Supabase MFA (TOTP).
//
// Esto protege la SESION de Supabase Auth (segunda capa al login).
// Es independiente del vault: aunque alguien pase el 2FA, el vault
// sigue cerrado sin la master password (Zero-Knowledge).
//
// Politica de dispositivos confiables: el "skip" del prompt 2FA en un
// dispositivo confiable es una decision de UX app-level — la sesion queda
// en AAL1. El dato sensible real (vault) nunca depende de esto.

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getOrCreateDeviceFingerprint } from "@/services/devices";
import { findDeviceByFingerprint } from "@/repositories/trusted-devices";
import { logAudit } from "@/services/audit";

export interface TotpEnrollment {
  factorId: string;
  /** SVG o data-URL del QR para escanear con la app authenticator. */
  qrCode: string;
  /** Secreto en texto para ingreso manual. */
  secret: string;
  uri: string;
}

export async function listVerifiedTotpFactors(): Promise<
  Array<{ id: string; friendly_name: string | null; created_at: string }>
> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp ?? [])
    .filter((f) => f.status === "verified")
    .map((f) => ({
      id: f.id,
      friendly_name: f.friendly_name ?? null,
      created_at: f.created_at,
    }));
}

export async function enrollTotp(): Promise<TotpEnrollment> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `VaultHub ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error) throw error;
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

export async function verifyTotpEnrollment(factorId: string, code: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error) throw challenge.error;
  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (verify.error) throw verify.error;
  void logAudit("device_trust", { mfa: "totp_enrolled" });
}

export async function unenrollTotp(factorId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
  void logAudit("device_revoke", { mfa: "totp_unenrolled" });
}

/** true si la cuenta tiene TOTP verificado y la sesion actual aun esta en AAL1. */
export async function mfaChallengeRequired(): Promise<{
  required: boolean;
  factorId: string | null;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  if (data.nextLevel === "aal2" && data.nextLevel !== data.currentLevel) {
    const factors = await listVerifiedTotpFactors();
    return { required: true, factorId: factors[0]?.id ?? null };
  }
  return { required: false, factorId: null };
}

/** Sube la sesion actual a AAL2 verificando un codigo TOTP. */
export async function verifyMfaChallenge(factorId: string, code: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error) throw challenge.error;
  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code,
  });
  if (verify.error) throw verify.error;
  void logAudit("login", { mfa: "totp_verified" });
}

/** Dispositivo actual marcado confiable y con trust vigente -> skip del prompt 2FA. */
export async function isCurrentDeviceTrusted(): Promise<boolean> {
  try {
    const fingerprint = getOrCreateDeviceFingerprint();
    const device = await findDeviceByFingerprint(fingerprint);
    if (!device || !device.is_trusted) return false;
    if (device.trusted_until && new Date(device.trusted_until) < new Date()) return false;
    return true;
  } catch {
    // ante cualquier duda, NO confiar (pedir 2FA es el camino conservador)
    return false;
  }
}
