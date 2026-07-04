// Analisis client-side del vault descifrado. Cero red — todo se computa
// sobre items ya en memoria (post-descifrado).

import { evaluatePasswordStrength, type PasswordStrength } from "@/lib/password";
import type { VaultItemDecrypted, VaultItemType } from "@/types/vault";

export interface DuplicateGroup {
  password: string;
  count: number;
  itemIds: string[];
}

export interface WeakItem {
  id: string;
  name: string;
  score: PasswordStrength["score"];
  entropyBits: number;
}

export interface VaultAnalysis {
  total: number;
  favorites: number;
  byType: Record<VaultItemType, number>;
  byCategory: Map<string | null, number>;

  withPassword: number;
  strong: number; // score >= 3
  fair: number; // score == 2
  weak: number; // score <= 1
  weakItems: WeakItem[];

  duplicates: DuplicateGroup[];
  duplicatedItemsCount: number;
}

interface WithPasswordPayload {
  name?: string;
  password?: string;
}

export function analyzeVault(items: VaultItemDecrypted[]): VaultAnalysis {
  const byType: Record<VaultItemType, number> = {
    password: 0,
    note: 0,
    api_key: 0,
    ssh_key: 0,
    card: 0,
    identity: 0,
    totp: 0,
  };
  const byCategory = new Map<string | null, number>();

  const passwordBuckets = new Map<string, string[]>(); // password -> itemIds
  const weakItems: WeakItem[] = [];

  let favorites = 0;
  let withPassword = 0;
  let strong = 0;
  let fair = 0;
  let weak = 0;

  for (const it of items) {
    byType[it.item_type] = (byType[it.item_type] ?? 0) + 1;
    byCategory.set(it.category_id, (byCategory.get(it.category_id) ?? 0) + 1);
    if (it.is_favorite) favorites += 1;

    const p = it.payload as WithPasswordPayload;
    if (typeof p.password === "string" && p.password.length > 0) {
      withPassword += 1;
      const list = passwordBuckets.get(p.password) ?? [];
      list.push(it.id);
      passwordBuckets.set(p.password, list);

      const strength = evaluatePasswordStrength(p.password);
      if (strength.score >= 3) strong += 1;
      else if (strength.score === 2) fair += 1;
      else {
        weak += 1;
        weakItems.push({
          id: it.id,
          name: p.name ?? "(sin nombre)",
          score: strength.score,
          entropyBits: strength.entropyBits,
        });
      }
    }
  }

  const duplicates: DuplicateGroup[] = [];
  let duplicatedItemsCount = 0;
  for (const [password, ids] of passwordBuckets) {
    if (ids.length > 1) {
      duplicates.push({ password, count: ids.length, itemIds: ids });
      duplicatedItemsCount += ids.length;
    }
  }
  // Mas duplicados primero.
  duplicates.sort((a, b) => b.count - a.count);
  weakItems.sort((a, b) => a.entropyBits - b.entropyBits);

  return {
    total: items.length,
    favorites,
    byType,
    byCategory,
    withPassword,
    strong,
    fair,
    weak,
    weakItems,
    duplicates,
    duplicatedItemsCount,
  };
}
