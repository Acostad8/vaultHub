// Chrome / Edge / Brave / Firefox — export nativo del password manager del navegador.
// Cabecera estándar: name,url,username,password,note
// (Firefox usa: url,username,password,httpRealm,formActionOrigin,guid,timeCreated,timeLastUsed,timePasswordChanged
//  — el parser detecta el shape flexible).

import type { ImportedItem, ImportResult } from "./types";
import { parseCsv } from "./csv";

export function parseChromeCsv(text: string): ImportResult {
  const csv = parseCsv(text);
  if (csv.rows.length === 0) {
    return { items: [], skipped: 0, reasons: ["CSV vacio"] };
  }

  const has = (h: string) => csv.headers.some((x) => x.toLowerCase() === h);
  const pick = (row: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      const match = csv.headers.find((h) => h.toLowerCase() === k.toLowerCase());
      if (match && row[match]) return row[match];
    }
    return "";
  };

  const looksChrome = has("name") && has("url") && has("username") && has("password");
  const looksFirefox = has("url") && has("username") && has("password") && !has("name");
  if (!looksChrome && !looksFirefox) {
    throw new Error(
      "El CSV no parece un export de navegador (faltan columnas name/url/username/password)",
    );
  }

  const items: ImportedItem[] = [];
  for (const row of csv.rows) {
    const url = pick(row, "url", "URL");
    const username = pick(row, "username", "usernameField", "usernameValue");
    const password = pick(row, "password", "passwordField", "passwordValue");
    let name = pick(row, "name", "title");
    if (!name && url) {
      try {
        name = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        name = url;
      }
    }
    if (!name) name = "(sin nombre)";
    items.push({
      item_type: "password",
      payload: {
        name,
        url: url || undefined,
        username: username || undefined,
        password: password || undefined,
        notes: pick(row, "note", "notes", "httpRealm") || undefined,
      },
    });
  }
  return { items, skipped: 0, reasons: [] };
}
