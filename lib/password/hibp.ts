// Chequeo contra HaveIBeenPwned usando k-Anonymity.
// El cliente calcula SHA-1 del password, envia SOLO los primeros 5 chars
// hex del hash, y HIBP devuelve todos los sufijos que colisionan con ese
// prefijo (~500-800 resultados por prefijo). El cliente busca su propio
// sufijo localmente.
//
// El password COMPLETO nunca sale del cliente. El hash SHA-1 completo
// tampoco. HIBP nunca sabe que password se consulto.
//
// API: https://api.pwnedpasswords.com/range/{prefix}
//   - GET request, sin auth
//   - Response text/plain con lineas "SUFFIX:COUNT" (35 chars hex + numero)
//   - Header "Add-Padding: true" solicita padding de respuesta para evitar
//     que un observador de red infiera cual prefijo se consulto por el
//     tamaño de la respuesta.

import { stringToBytes } from "../crypto/base64";

const HIBP_ENDPOINT = "https://api.pwnedpasswords.com/range/";

/** Convierte ArrayBuffer/Uint8Array a hex string uppercase. */
function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex.toUpperCase();
}

/** Calcula SHA-1 hex uppercase del password en texto plano. */
export async function sha1Hex(input: string): Promise<string> {
  const bytes = stringToBytes(input);
  const digest = await crypto.subtle.digest("SHA-1", bytes as BufferSource);
  return bytesToHex(new Uint8Array(digest));
}

export interface HibpCheckResult {
  /** Cuantas veces aparece este password en breaches. 0 = no encontrado. */
  count: number;
  breached: boolean;
  /** Prefijo enviado (para debug/logs, no sensible por diseno). */
  prefix: string;
}

export interface HibpCheckOptions {
  /** Inyectable para tests o para forzar padding-related headers. */
  fetchImpl?: typeof fetch;
  /** AbortSignal para cancelar consulta. */
  signal?: AbortSignal;
}

/**
 * Consulta HIBP con k-anonymity. Ver header de archivo para detalles.
 *
 * Nunca loguea el password ni el hash completo. En caso de error de red,
 * arroja Error con mensaje generico ("HIBP no disponible") — el detalle
 * queda en la Error.cause para debug local, pero no debe mostrarse al
 * usuario en produccion tal cual.
 */
export async function checkHibp(
  password: string,
  options: HibpCheckOptions = {},
): Promise<HibpCheckResult> {
  if (password.length === 0) {
    throw new Error("Password vacio");
  }

  const hashHex = await sha1Hex(password);
  const prefix = hashHex.substring(0, 5);
  const suffix = hashHex.substring(5);

  const fetchFn = options.fetchImpl ?? fetch;
  const url = HIBP_ENDPOINT + prefix;

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: "GET",
      headers: { "Add-Padding": "true" },
      signal: options.signal,
    });
  } catch (cause) {
    throw new Error("HIBP no disponible", { cause });
  }

  if (!response.ok) {
    throw new Error(`HIBP respondio ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (line.length === 0) continue;
    const [linSuffix, countRaw] = line.split(":");
    if (!linSuffix || !countRaw) continue;
    if (linSuffix.trim().toUpperCase() === suffix) {
      const count = parseInt(countRaw.trim(), 10);
      // count === 0 son entradas de padding (HIBP las inyecta cuando se
      // envia Add-Padding: true para camuflar el tamaño de la respuesta).
      // Si nuestro sufijo esta con count 0, se considera "no encontrado".
      if (count === 0) break;
      return { count, breached: true, prefix };
    }
  }

  return { count: 0, breached: false, prefix };
}
