// LastPass CSV export.
// Cabecera estándar: url,username,password,totp,extra,name,grouping,fav
// - grouping = folder (nested con "\" o "/")
// - extra = notas + potencialmente Secure Note payload (marcado con
//   "NoteType:" en la primera línea)

import type { ImportedItem, ImportResult } from "./types";
import { parseCsv } from "./csv";

export function parseLastPassCsv(text: string): ImportResult {
  const csv = parseCsv(text);
  if (csv.rows.length === 0) {
    return { items: [], skipped: 0, reasons: ["CSV vacio"] };
  }
  const required = ["url", "username", "password", "name"];
  const missing = required.filter(
    (r) => !csv.headers.some((h) => h.toLowerCase() === r),
  );
  if (missing.length > 0) {
    throw new Error(`CSV LastPass sin columnas: ${missing.join(", ")}`);
  }

  const pick = (row: Record<string, string>, key: string) => {
    const match = csv.headers.find((h) => h.toLowerCase() === key.toLowerCase());
    return match ? row[match] ?? "" : "";
  };

  const items: ImportedItem[] = [];
  const reasons: string[] = [];
  const skipped = 0;

  for (const row of csv.rows) {
    const name = pick(row, "name") || "(sin nombre)";
    const url = pick(row, "url");
    const extra = pick(row, "extra");
    const grouping = pick(row, "grouping");
    const fav = pick(row, "fav") === "1";
    const totp = pick(row, "totp");

    // LastPass marca Secure Notes con `url = "http://sn"`.
    if (url === "http://sn") {
      items.push({
        item_type: "note",
        category_name: grouping || null,
        is_favorite: fav,
        payload: { name, body: extra },
      });
      continue;
    }

    const password = pick(row, "password");
    items.push({
      item_type: "password",
      category_name: grouping || null,
      is_favorite: fav,
      payload: {
        name,
        url: url || undefined,
        username: pick(row, "username") || undefined,
        password: password || undefined,
        totp_secret: totp || undefined,
        notes: extra || undefined,
      },
    });
  }

  return { items, skipped, reasons };
}
