// Punto de entrada del import de terceros. La UI usa `parseImport(source, file)`
// para obtener `ImportResult` y luego `commitImport(items)` para persistir
// (encripta client-side + inserta via `createItem`).

import { createCategory, listDecryptedCategories } from "@/services/categories";
import { createItem } from "@/services/vault-items";
import { logAudit } from "@/services/audit";

import { parseBitwardenExport } from "./bitwarden";
import { parseChromeCsv } from "./chrome";
import { parseLastPassCsv } from "./lastpass";
import { parseOnePasswordAuto } from "./1password";
import type { ImportResult, ImportSource, ImportedItem } from "./types";

export * from "./types";

export async function parseImportFile(
  source: ImportSource,
  file: File,
): Promise<ImportResult> {
  const text = await file.text();
  switch (source) {
    case "bitwarden": {
      const json = JSON.parse(text);
      return parseBitwardenExport(json);
    }
    case "1password":
      return parseOnePasswordAuto(text);
    case "lastpass":
      return parseLastPassCsv(text);
    case "chrome":
      return parseChromeCsv(text);
  }
}

export interface CommitResult {
  itemsImported: number;
  categoriesCreated: number;
}

export async function commitImport(items: ImportedItem[]): Promise<CommitResult> {
  const existing = await listDecryptedCategories();
  const catIdByName = new Map(existing.map((c) => [c.name, c.id]));

  let categoriesCreated = 0;
  for (const it of items) {
    const catName = it.category_name?.trim();
    if (catName && !catIdByName.has(catName)) {
      const created = await createCategory({ name: catName });
      catIdByName.set(catName, created.id);
      categoriesCreated += 1;
    }
  }

  let itemsImported = 0;
  for (const it of items) {
    const catId = it.category_name ? catIdByName.get(it.category_name.trim()) ?? null : null;
    await createItem({
      item_type: it.item_type,
      payload: it.payload,
      category_id: catId,
      is_favorite: it.is_favorite ?? false,
    });
    itemsImported += 1;
  }

  void logAudit("import", { items: itemsImported, categories: categoriesCreated });
  return { itemsImported, categoriesCreated };
}
