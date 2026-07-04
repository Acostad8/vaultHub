// Orquestacion del vault: setup master password, unlock, y helpers de
// cifrado a nivel de item. La UI llama aqui, nunca a lib/crypto ni a
// repositories/ directamente.

import {
  deriveMasterKey,
  encryptPayload,
  decryptPayload,
  PBKDF2_DEFAULT_ITERATIONS,
} from "@/lib/crypto";
import { fetchMyProfile, saveVaultVerifier, touchLastUnlock, type ProfileRow } from "@/repositories/profile";
import { useVaultLock } from "@/store/vault-lock";
import { logAudit } from "@/services/audit";

// Plaintext arbitrario pero constante para el verifier. No es secreto —
// solo se usa para probar que la master password derivada correctamente.
const VERIFIER_PLAINTEXT = "vaulthub-verify-v1";

/**
 * Primera vez: usuario elige su master password. Derivamos key con salt
 * del profile + PBKDF2_DEFAULT_ITERATIONS, cifra el verifier, y guarda en
 * profile. La key queda en el store para operaciones inmediatas.
 */
export async function setupVault(masterPassword: string): Promise<void> {
  const profile = await fetchMyProfile();
  if (profile.vault_initialized_at) {
    throw new Error("Vault ya inicializado. Usa unlock, no setup.");
  }

  const key = await deriveMasterKey({
    password: masterPassword,
    saltBase64: profile.master_password_salt,
    iterations: profile.kdf_iterations || PBKDF2_DEFAULT_ITERATIONS,
  });

  const envelope = await encryptPayload(key, VERIFIER_PLAINTEXT);
  await saveVaultVerifier({
    verifierCiphertext: envelope.ciphertext,
    verifierIv: envelope.iv,
  });

  useVaultLock.getState().unlock(key);
  void logAudit("vault_unlock", { first_time: true });
}

/**
 * Usuario ya tiene vault inicializado: prueba la master password
 * descifrando el verifier. Si funciona, la key es correcta.
 */
export async function unlockVault(masterPassword: string): Promise<void> {
  const profile = await fetchMyProfile();
  if (!profile.vault_initialized_at || !profile.verifier_ciphertext || !profile.verifier_iv) {
    throw new Error("Vault no inicializado. Configura tu master password primero.");
  }

  const key = await deriveMasterKey({
    password: masterPassword,
    saltBase64: profile.master_password_salt,
    iterations: profile.kdf_iterations,
  });

  let plaintext: string;
  try {
    plaintext = await decryptPayload<string>(key, {
      ciphertext: profile.verifier_ciphertext,
      iv: profile.verifier_iv,
    });
  } catch {
    throw new Error("Master password incorrecta");
  }

  if (plaintext !== VERIFIER_PLAINTEXT) {
    throw new Error("Verifier corrupto o master password incorrecta");
  }

  useVaultLock.getState().unlock(key);
  await touchLastUnlock().catch(() => {
    // No fatal: es solo un timestamp.
  });
  void logAudit("vault_unlock");
}

export function isVaultInitialized(profile: ProfileRow): boolean {
  return profile.vault_initialized_at != null;
}
