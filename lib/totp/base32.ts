// RFC 4648 base32 (uppercase, alphabet A-Z 2-7, no padding en decode).
// TOTP secrets se comparten universalmente en base32 (URIs otpauth://,
// codigos manuales de Google Authenticator, Aegis, etc).

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Uint8Array {
  const cleaned = input.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  if (cleaned.length === 0) return new Uint8Array(0);

  const output: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const ch of cleaned) {
    const value = ALPHABET.indexOf(ch);
    if (value < 0) {
      throw new Error(`base32Decode: caracter invalido '${ch}'`);
    }
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
    }
  }

  return new Uint8Array(output);
}

export function base32Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += ALPHABET[(buffer >> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    output += ALPHABET[(buffer << (5 - bits)) & 0x1f];
  }
  return output;
}
