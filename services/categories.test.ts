import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock repos ANTES del import del service.
vi.mock("@/repositories/categories", () => {
  const store: { rows: Array<{ id: string; sort_order: number }> } = { rows: [] };
  return {
    __store: store,
    listCategories: vi.fn(async () =>
      [...store.rows].sort((a, b) => a.sort_order - b.sort_order),
    ),
    insertCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    updateCategoryOrder: vi.fn(async (ids: string[]) => {
      ids.forEach((id, idx) => {
        const row = store.rows.find((r) => r.id === id);
        if (row) row.sort_order = idx;
      });
    }),
  };
});

vi.mock("@/store/vault-lock", () => ({
  useVaultLock: {
    getState: () => ({ requireKey: () => ({} as CryptoKey) }),
  },
}));

vi.mock("@/store/vault-cache", () => ({
  useVaultCache: {
    getState: () => ({ invalidateCategories: vi.fn() }),
  },
}));

vi.mock("@/lib/crypto", () => ({
  encryptPayload: vi.fn(),
  decryptPayload: vi.fn(),
}));

import { reorderCategories } from "./categories";
import * as repo from "@/repositories/categories";

// El mock expone el store bajo la propiedad __store (cast unknown → shape).
const store = (
  repo as unknown as { __store: { rows: Array<{ id: string; sort_order: number }> } }
).__store;

describe("reorderCategories", () => {
  beforeEach(() => {
    store.rows = [
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 1 },
      { id: "c", sort_order: 2 },
    ];
  });

  it("persiste el orden nuevo y sobrevive a un 'reload' desde el repo", async () => {
    await reorderCategories(["c", "a", "b"]);

    // El repo ordena por sort_order — el nuevo orden debe reflejarse tras releer.
    const reloaded = await repo.listCategories();
    expect(reloaded.map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(reloaded.map((r) => r.sort_order)).toEqual([0, 1, 2]);
  });

  it("no persiste nada si el array es vacio", async () => {
    await reorderCategories([]);
    const reloaded = await repo.listCategories();
    expect(reloaded.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});
