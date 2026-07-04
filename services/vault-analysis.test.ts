import { describe, it, expect } from "vitest";

import { analyzeVault } from "./vault-analysis";
import type { VaultItemDecrypted, VaultItemType } from "@/types/vault";

function mkItem(
  id: string,
  itemType: VaultItemType,
  payload: Record<string, unknown>,
  overrides: Partial<VaultItemDecrypted> = {},
): VaultItemDecrypted {
  return {
    id,
    item_type: itemType,
    category_id: null,
    is_favorite: false,
    deleted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    payload: payload as unknown as VaultItemDecrypted["payload"],
    ...overrides,
  };
}

describe("analyzeVault", () => {
  it("cuenta totales por tipo y favoritos", () => {
    const items = [
      mkItem("1", "password", { name: "A", password: "Xk9!mZq2*Lp8@Rt5" }, { is_favorite: true }),
      mkItem("2", "note", { name: "N", body: "..." }),
      mkItem("3", "totp", { name: "T", secret: "AAAA" }, { is_favorite: true }),
    ];
    const a = analyzeVault(items);
    expect(a.total).toBe(3);
    expect(a.favorites).toBe(2);
    expect(a.byType.password).toBe(1);
    expect(a.byType.note).toBe(1);
    expect(a.byType.totp).toBe(1);
    expect(a.byType.card).toBe(0);
  });

  it("detecta passwords duplicados", () => {
    const items = [
      mkItem("1", "password", { name: "A", password: "hunter2" }),
      mkItem("2", "password", { name: "B", password: "hunter2" }),
      mkItem("3", "password", { name: "C", password: "hunter2" }),
      mkItem("4", "password", { name: "D", password: "unico" }),
    ];
    const a = analyzeVault(items);
    expect(a.duplicates.length).toBe(1);
    expect(a.duplicates[0]!.count).toBe(3);
    expect(a.duplicates[0]!.itemIds.sort()).toEqual(["1", "2", "3"]);
    expect(a.duplicatedItemsCount).toBe(3);
  });

  it("clasifica strong/fair/weak segun strength", () => {
    const items = [
      mkItem("1", "password", { name: "veryweak", password: "abc" }),
      mkItem("2", "password", { name: "strong", password: "Xk9!mZq2*Lp8@Rt5#Nv7&By3" }),
      mkItem("3", "password", { name: "fair", password: "Abcdef123!" }),
    ];
    const a = analyzeVault(items);
    expect(a.weak).toBeGreaterThanOrEqual(1);
    expect(a.strong).toBeGreaterThanOrEqual(1);
    expect(a.weakItems.length).toBe(a.weak);
    expect(a.withPassword).toBe(3);
  });

  it("ignora items sin campo password", () => {
    const items = [
      mkItem("1", "note", { name: "N", body: "..." }),
      mkItem("2", "totp", { name: "T", secret: "AAAA" }),
    ];
    const a = analyzeVault(items);
    expect(a.withPassword).toBe(0);
    expect(a.strong + a.fair + a.weak).toBe(0);
    expect(a.duplicates.length).toBe(0);
  });

  it("agrupa por category_id incluyendo null", () => {
    const items = [
      mkItem("1", "password", { name: "A", password: "p1" }, { category_id: "cat1" }),
      mkItem("2", "password", { name: "B", password: "p2" }, { category_id: "cat1" }),
      mkItem("3", "note", { name: "N", body: "..." }, { category_id: null }),
    ];
    const a = analyzeVault(items);
    expect(a.byCategory.get("cat1")).toBe(2);
    expect(a.byCategory.get(null)).toBe(1);
  });
});
