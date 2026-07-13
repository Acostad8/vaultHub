// 1Password: soporta CSV moderno (1P >= 8) y 1PIF legacy.
//
// - CSV headers típicos: Title,Url,Username,Password,OTPAuth,Notes,Type,Section
// - 1PIF: cada línea es un JSON separado por "***5642bee8-a5ff-11dc-8314-0800200c9a66***"
//   (formato específico de 1P). Cada objeto tiene { uuid, title, category, secureContents:{fields, notesPlain, urls}}.

import type { ImportedItem, ImportResult } from "./types";
import { parseCsv } from "./csv";

interface OnePifSecureContentField {
  designation?: string;
  name?: string;
  value?: string;
  t?: string;
  v?: string;
}
interface OnePifSecureContents {
  fields?: OnePifSecureContentField[];
  sections?: Array<{
    fields?: Array<{ t?: string; v?: string; n?: string }>;
  }>;
  notesPlain?: string;
  URLs?: Array<{ url: string }>;
}
interface OnePifRecord {
  uuid?: string;
  title?: string;
  typeName?: string;
  category?: string;
  secureContents?: OnePifSecureContents;
}

function fieldValue(sc: OnePifSecureContents | undefined, designation: string): string | undefined {
  if (!sc?.fields) return undefined;
  const f = sc.fields.find((x) => x.designation === designation);
  return f?.value;
}

export function parseOnePasswordCsv(text: string): ImportResult {
  const csv = parseCsv(text);
  if (csv.rows.length === 0) return { items: [], skipped: 0, reasons: ["CSV vacio"] };

  const pick = (row: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      const match = csv.headers.find((h) => h.toLowerCase() === k.toLowerCase());
      if (match && row[match]) return row[match];
    }
    return "";
  };

  if (!csv.headers.some((h) => h.toLowerCase() === "title")) {
    throw new Error("CSV 1Password no tiene columna Title");
  }

  const items: ImportedItem[] = [];
  const reasons: string[] = [];
  const skipped = 0;

  for (const row of csv.rows) {
    const name = pick(row, "title") || "(sin nombre)";
    const url = pick(row, "url", "website");
    const username = pick(row, "username");
    const password = pick(row, "password");
    const notes = pick(row, "notes");
    const type = pick(row, "type").toLowerCase();

    if (!password && !username && !url) {
      // Probablemente Secure Note
      items.push({
        item_type: "note",
        payload: { name, body: notes },
      });
      continue;
    }

    if (type.includes("card") || type.includes("credit")) {
      items.push({
        item_type: "card",
        payload: {
          name,
          cardholder: pick(row, "cardholder", "cardholder name") ?? "",
          number: password || pick(row, "number", "cardnumber") || "",
          exp_month: pick(row, "expiry month", "expmonth"),
          exp_year: pick(row, "expiry year", "expyear"),
          cvv: pick(row, "verification number", "cvv") || undefined,
          notes: notes || undefined,
        },
      });
      continue;
    }

    items.push({
      item_type: "password",
      payload: {
        name,
        url: url || undefined,
        username: username || undefined,
        password: password || undefined,
        totp_secret: pick(row, "otpauth", "one-time password") || undefined,
        notes: notes || undefined,
      },
    });
  }

  return { items, skipped, reasons };
}

// 1PIF es un stream de JSON separado por un marker fijo definido por AgileBits.
const ONEPIF_SEPARATOR = "***5642bee8-a5ff-11dc-8314-0800200c9a66***";

export function parseOnePasswordPif(text: string): ImportResult {
  const parts = text
    .split(ONEPIF_SEPARATOR)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const items: ImportedItem[] = [];
  const reasons: string[] = [];
  let skipped = 0;

  for (const part of parts) {
    let rec: OnePifRecord;
    try {
      rec = JSON.parse(part) as OnePifRecord;
    } catch {
      skipped += 1;
      reasons.push("bloque 1PIF con JSON invalido");
      continue;
    }
    const name = rec.title ?? "(sin nombre)";
    const sc = rec.secureContents;
    const type = (rec.typeName ?? rec.category ?? "").toLowerCase();

    if (type.includes("password") || type.includes("login") || type.includes("webform")) {
      const url = sc?.URLs?.[0]?.url;
      items.push({
        item_type: "password",
        payload: {
          name,
          url: url ?? undefined,
          username: fieldValue(sc, "username") ?? undefined,
          password: fieldValue(sc, "password") ?? undefined,
          notes: sc?.notesPlain,
        },
      });
      continue;
    }

    if (type.includes("securenote") || type.includes("note")) {
      items.push({
        item_type: "note",
        payload: { name, body: sc?.notesPlain ?? "" },
      });
      continue;
    }

    // Cualquier otro tipo (identity/card/etc): fallback a note para no perder data.
    items.push({
      item_type: "note",
      payload: {
        name,
        body:
          sc?.notesPlain ??
          JSON.stringify(sc?.fields ?? [], null, 2),
      },
    });
    reasons.push(`typeName='${rec.typeName ?? "?"}' importado como nota`);
  }

  return { items, skipped, reasons };
}

// Autodetector: si el archivo empieza por "{" o "[" -> JSON; si tiene el
// separator 1PIF -> pif; si tiene el header CSV -> csv.
export function parseOnePasswordAuto(text: string): ImportResult {
  if (text.includes(ONEPIF_SEPARATOR)) return parseOnePasswordPif(text);
  const first = text.trimStart()[0];
  if (first === "{" || first === "[") {
    throw new Error(
      "1Password JSON no soportado directamente. Exporta como CSV o 1PIF.",
    );
  }
  return parseOnePasswordCsv(text);
}
