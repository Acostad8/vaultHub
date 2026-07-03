// Implementacion RFC 6238 (TOTP) sobre RFC 4226 (HOTP), usando Web Crypto
// API para HMAC. Sin dependencias externas.
//
// El secret compartido con el emisor de codigos se cifra client-side con
// la master key antes de guardarse en vault_items (payload). Este modulo
// solo genera el codigo actual — el ciclo de vida del secret lo maneja
// la capa CRUD (Fase 5+7).

import { base32Decode } from "./base32";

export type TotpAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

export interface TotpOptions {
  /** Segundos por ventana. Default RFC = 30. */
  period?: number;
  /** Digitos del codigo. RFC permite 6 o 8. Default 6. */
  digits?: 6 | 7 | 8;
  /** Algoritmo HMAC. Google Authenticator solo soporta SHA-1 en la practica. */
  algorithm?: TotpAlgorithm;
  /** Reloj UNIX en segundos. Default Date.now()/1000. Testeable con override. */
  now?: () => number;
}

interface ResolvedOptions {
  period: number;
  digits: 6 | 7 | 8;
  algorithm: TotpAlgorithm;
  now: () => number;
}

function resolve(opts: TotpOptions | undefined): ResolvedOptions {
  return {
    period: opts?.period ?? 30,
    digits: opts?.digits ?? 6,
    algorithm: opts?.algorithm ?? "SHA-1",
    now: opts?.now ?? (() => Math.floor(Date.now() / 1000)),
  };
}

function counterToBytes(counter: number): Uint8Array {
  // 8 bytes big-endian. JS numbers son enteros seguros hasta 2^53, y
  // el counter TOTP en segundos / 30 no llega ni a 2^36 en decadas — safe.
  const bytes = new Uint8Array(8);
  let n = counter;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = n & 0xff;
    n = Math.floor(n / 256);
  }
  return bytes;
}

async function hmac(algorithm: TotpAlgorithm, keyBytes: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, msg as BufferSource);
  return new Uint8Array(sig);
}

/**
 * Genera el codigo TOTP para el timestamp actual (o el inyectado en opts.now).
 * Secret en base32 (formato estandar de Google Authenticator etc).
 */
export async function generateTotpCode(secretBase32: string, opts?: TotpOptions): Promise<string> {
  const { period, digits, algorithm, now } = resolve(opts);

  const keyBytes = base32Decode(secretBase32);
  if (keyBytes.length === 0) {
    throw new Error("Secret TOTP vacio");
  }

  const counter = Math.floor(now() / period);
  const counterBytes = counterToBytes(counter);
  const hash = await hmac(algorithm, keyBytes, counterBytes);

  // Dynamic truncation (RFC 4226 §5.3).
  const offset = hash[hash.length - 1]! & 0x0f;
  const binCode =
    ((hash[offset]! & 0x7f) << 24) |
    ((hash[offset + 1]! & 0xff) << 16) |
    ((hash[offset + 2]! & 0xff) << 8) |
    (hash[offset + 3]! & 0xff);

  const mod = Math.pow(10, digits);
  const code = (binCode % mod).toString().padStart(digits, "0");
  return code;
}

/** Segundos restantes hasta que el codigo actual expire. Util para UI. */
export function secondsUntilNextTotp(opts?: TotpOptions): number {
  const { period, now } = resolve(opts);
  return period - (now() % period);
}

/**
 * Verifica que un codigo introducido matchea el actual o el anterior (window=1).
 * Un `window` de +/-1 tolera drift de reloj de hasta `period` segundos.
 */
export async function verifyTotpCode(
  secretBase32: string,
  code: string,
  opts?: TotpOptions & { window?: number },
): Promise<boolean> {
  const resolved = resolve(opts);
  const window = opts?.window ?? 1;
  if (!/^\d+$/.test(code)) return false;

  const baseNow = resolved.now();
  for (let offset = -window; offset <= window; offset++) {
    const shifted = () => baseNow + offset * resolved.period;
    const candidate = await generateTotpCode(secretBase32, { ...opts, now: shifted });
    if (candidate === code) return true;
  }
  return false;
}
