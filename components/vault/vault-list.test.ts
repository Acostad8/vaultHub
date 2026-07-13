import { describe, it, expect } from "vitest";

import {
  EMPTY_FILTERS,
  countAdvancedActive,
  hasAnyActiveFilter,
  matchesFilters,
} from "./vault-list-filters";
import type { VaultItemDecrypted, VaultItemType } from "@/types/vault";

function mk(
  id: string,
  type: VaultItemType,
  overrides: Partial<VaultItemDecrypted> = {},
): VaultItemDecrypted {
  return {
    id,
    item_type: type,
    category_id: null,
    is_favorite: false,
    deleted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-15T12:00:00Z",
    payload: { name: `item-${id}` } as unknown as VaultItemDecrypted["payload"],
    ...overrides,
  };
}

describe("matchesFilters (búsqueda avanzada)", () => {
  it("acepta cualquier item con filtros vacíos", () => {
    expect(matchesFilters(mk("1", "password"), [], EMPTY_FILTERS)).toBe(true);
  });

  it("filtra por tipo, categoría y favoritos combinados", () => {
    const item = mk("1", "password", { category_id: "cat-a", is_favorite: true });
    expect(
      matchesFilters(item, [], {
        ...EMPTY_FILTERS,
        type: "password",
        categoryId: "cat-a",
        onlyFavorites: true,
      }),
    ).toBe(true);
    expect(matchesFilters(item, [], { ...EMPTY_FILTERS, type: "note" })).toBe(false);
    expect(
      matchesFilters(item, [], { ...EMPTY_FILTERS, categoryId: "otra" }),
    ).toBe(false);
    expect(
      matchesFilters(mk("2", "password"), [], { ...EMPTY_FILTERS, onlyFavorites: true }),
    ).toBe(false);
  });

  it("multi-tag es AND — todos los tags deben estar presentes", () => {
    const item = mk("1", "password");
    expect(
      matchesFilters(item, ["t1", "t2", "t3"], { ...EMPTY_FILTERS, tagIds: ["t1", "t2"] }),
    ).toBe(true);
    expect(
      matchesFilters(item, ["t1"], { ...EMPTY_FILTERS, tagIds: ["t1", "t2"] }),
    ).toBe(false);
  });

  it("rango updated_at inclusivo en ambos extremos", () => {
    const item = mk("1", "password", { updated_at: "2026-06-15T12:00:00Z" });
    expect(
      matchesFilters(item, [], {
        ...EMPTY_FILTERS,
        updatedFrom: "2026-06-15",
        updatedTo: "2026-06-15",
      }),
    ).toBe(true);
    expect(matchesFilters(item, [], { ...EMPTY_FILTERS, updatedFrom: "2026-06-16" })).toBe(false);
    expect(matchesFilters(item, [], { ...EMPTY_FILTERS, updatedTo: "2026-06-14" })).toBe(false);
  });

  it("query hace substring case-insensitive sobre payload.name/username/url", () => {
    const item = mk("1", "password", {
      payload: {
        name: "GitHub Personal",
        username: "octocat",
        url: "https://github.com",
      } as unknown as VaultItemDecrypted["payload"],
    });
    expect(matchesFilters(item, [], { ...EMPTY_FILTERS, query: "github" })).toBe(true);
    expect(matchesFilters(item, [], { ...EMPTY_FILTERS, query: "OCTO" })).toBe(true);
    expect(matchesFilters(item, [], { ...EMPTY_FILTERS, query: "gitlab" })).toBe(false);
  });
});

describe("helpers de estado de filtros", () => {
  it("hasAnyActiveFilter detecta cualquier campo activo", () => {
    expect(hasAnyActiveFilter(EMPTY_FILTERS)).toBe(false);
    expect(hasAnyActiveFilter({ ...EMPTY_FILTERS, query: "x" })).toBe(true);
    expect(hasAnyActiveFilter({ ...EMPTY_FILTERS, type: "password" })).toBe(true);
    expect(hasAnyActiveFilter({ ...EMPTY_FILTERS, tagIds: ["t"] })).toBe(true);
    expect(hasAnyActiveFilter({ ...EMPTY_FILTERS, updatedFrom: "2026-01-01" })).toBe(true);
  });

  it("countAdvancedActive cuenta tags + fechas", () => {
    expect(countAdvancedActive(EMPTY_FILTERS)).toBe(0);
    expect(
      countAdvancedActive({
        ...EMPTY_FILTERS,
        tagIds: ["t"],
        updatedFrom: "2026-01-01",
        updatedTo: "2026-01-31",
      }),
    ).toBe(3);
  });
});
