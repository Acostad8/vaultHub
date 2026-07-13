// Helpers puros para la búsqueda avanzada de la lista del vault. Vive aparte
// del componente para poder testearlo sin cargar toda la cadena de imports
// React/UI en vitest (env node).

import type { VaultItemDecrypted, VaultItemType } from "@/types/vault";

export interface Filters {
  query: string;
  type: VaultItemType | "all";
  categoryId: string | "all";
  // Multi-select — AND: item debe tener TODOS los tags seleccionados.
  tagIds: string[];
  onlyFavorites: boolean;
  // YYYY-MM-DD (inclusive), o "" si sin límite.
  updatedFrom: string;
  updatedTo: string;
}

export const EMPTY_FILTERS: Filters = {
  query: "",
  type: "all",
  categoryId: "all",
  tagIds: [],
  onlyFavorites: false,
  updatedFrom: "",
  updatedTo: "",
};

export function matchesFilters(
  item: VaultItemDecrypted,
  tagIdsForItem: string[],
  filters: Filters,
): boolean {
  if (filters.type !== "all" && item.item_type !== filters.type) return false;
  if (filters.categoryId !== "all" && item.category_id !== filters.categoryId) return false;
  if (filters.tagIds.length > 0) {
    const setForItem = new Set(tagIdsForItem);
    for (const tid of filters.tagIds) if (!setForItem.has(tid)) return false;
  }
  if (filters.onlyFavorites && !item.is_favorite) return false;

  if (filters.updatedFrom || filters.updatedTo) {
    const updatedMs = new Date(item.updated_at).getTime();
    if (filters.updatedFrom) {
      const fromMs = new Date(`${filters.updatedFrom}T00:00:00`).getTime();
      if (Number.isFinite(fromMs) && updatedMs < fromMs) return false;
    }
    if (filters.updatedTo) {
      const toMs = new Date(`${filters.updatedTo}T23:59:59.999`).getTime();
      if (Number.isFinite(toMs) && updatedMs > toMs) return false;
    }
  }

  if (filters.query.trim() === "") return true;
  const needle = filters.query.trim().toLowerCase();
  const p = item.payload as {
    name?: string;
    username?: string;
    url?: string;
    body?: string;
    issuer?: string;
    cardholder?: string;
    full_name?: string;
    notes?: string;
  };
  const hay = [p.name, p.username, p.url, p.body, p.issuer, p.cardholder, p.full_name, p.notes]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export function hasAnyActiveFilter(filters: Filters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.type !== "all" ||
    filters.categoryId !== "all" ||
    filters.tagIds.length > 0 ||
    filters.onlyFavorites ||
    filters.updatedFrom !== "" ||
    filters.updatedTo !== ""
  );
}

export function countAdvancedActive(filters: Filters): number {
  return (
    (filters.tagIds.length > 0 ? 1 : 0) +
    (filters.updatedFrom ? 1 : 0) +
    (filters.updatedTo ? 1 : 0)
  );
}
