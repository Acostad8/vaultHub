// Cache en memoria de items/categorias/tags descifrados. Vive solo mientras
// el vault esta unlocked — se limpia en lock/logout. Evita re-descargar y
// re-descifrar todo en cada navegacion entre paginas del area autenticada.
//
// Regla dura de CLAUDE.md: nada de esto en localStorage/IndexedDB/cookies.

import { create } from "zustand";

import type { DecryptedCategory } from "@/services/categories";
import type { DecryptedTag } from "@/services/tags";
import type { VaultItemDecrypted } from "@/types/vault";

interface VaultCacheStore {
  items: VaultItemDecrypted[] | null;
  categories: DecryptedCategory[] | null;
  tags: DecryptedTag[] | null;
  itemTagsMap: Map<string, string[]> | null;

  setItems: (items: VaultItemDecrypted[]) => void;
  setCategories: (cats: DecryptedCategory[]) => void;
  setTags: (tags: DecryptedTag[]) => void;
  setItemTagsMap: (map: Map<string, string[]>) => void;

  patchItem: (id: string, patch: Partial<VaultItemDecrypted>) => void;
  removeItem: (id: string) => void;
  addItem: (item: VaultItemDecrypted) => void;

  invalidateItems: () => void;
  invalidateCategories: () => void;
  invalidateTags: () => void;
  invalidateItemTags: () => void;
  invalidateAll: () => void;
}

export const useVaultCache = create<VaultCacheStore>((set) => ({
  items: null,
  categories: null,
  tags: null,
  itemTagsMap: null,

  setItems(items) {
    set({ items });
  },
  setCategories(categories) {
    set({ categories });
  },
  setTags(tags) {
    set({ tags });
  },
  setItemTagsMap(itemTagsMap) {
    set({ itemTagsMap });
  },

  patchItem(id, patch) {
    set((state) => ({
      items: state.items?.map((it) => (it.id === id ? { ...it, ...patch } : it)) ?? state.items,
    }));
  },
  removeItem(id) {
    set((state) => ({
      items: state.items?.filter((it) => it.id !== id) ?? state.items,
    }));
  },
  addItem(item) {
    set((state) => ({
      items: state.items ? [item, ...state.items] : state.items,
    }));
  },

  invalidateItems() {
    set({ items: null });
  },
  invalidateCategories() {
    set({ categories: null });
  },
  invalidateTags() {
    set({ tags: null });
  },
  invalidateItemTags() {
    set({ itemTagsMap: null });
  },
  invalidateAll() {
    set({ items: null, categories: null, tags: null, itemTagsMap: null });
  },
}));

export function clearVaultCache(): void {
  useVaultCache.getState().invalidateAll();
}
