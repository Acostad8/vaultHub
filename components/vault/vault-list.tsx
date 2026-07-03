"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  listDecryptedItems,
  toggleFavorite,
  trashItem,
} from "@/services/vault-items";
import { listDecryptedCategories, type DecryptedCategory } from "@/services/categories";
import { fetchItemTagsMap, listDecryptedTags, type DecryptedTag } from "@/services/tags";
import type { VaultItemDecrypted, VaultItemType } from "@/types/vault";

const TYPE_LABELS: Record<VaultItemType, string> = {
  password: "Password",
  note: "Nota",
  api_key: "API Key",
  ssh_key: "SSH",
  card: "Tarjeta",
  identity: "Identidad",
  totp: "TOTP",
};

interface Filters {
  query: string;
  type: VaultItemType | "all";
  categoryId: string | "all";
  tagId: string | "all";
  onlyFavorites: boolean;
}

function matchesFilters(
  item: VaultItemDecrypted,
  tagIdsForItem: string[],
  filters: Filters,
): boolean {
  if (filters.type !== "all" && item.item_type !== filters.type) return false;
  if (filters.categoryId !== "all" && item.category_id !== filters.categoryId) return false;
  if (filters.tagId !== "all" && !tagIdsForItem.includes(filters.tagId)) return false;
  if (filters.onlyFavorites && !item.is_favorite) return false;

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

export function VaultList() {
  const [items, setItems] = useState<VaultItemDecrypted[] | null>(null);
  const [categories, setCategories] = useState<DecryptedCategory[]>([]);
  const [tags, setTags] = useState<DecryptedTag[]>([]);
  const [itemTagsMap, setItemTagsMap] = useState<Map<string, string[]>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    query: "",
    type: "all",
    categoryId: "all",
    tagId: "all",
    onlyFavorites: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [decrypted, cats, tgs, tagMap] = await Promise.all([
          listDecryptedItems(),
          listDecryptedCategories(),
          listDecryptedTags(),
          fetchItemTagsMap(),
        ]);
        if (cancelled) return;
        setItems(decrypted);
        setCategories(cats);
        setTags(tgs);
        setItemTagsMap(tagMap);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    return items.filter((it) => matchesFilters(it, itemTagsMap.get(it.id) ?? [], filters));
  }, [items, itemTagsMap, filters]);

  async function handleDelete(id: string) {
    if (!confirm("Enviar a la papelera?")) return;
    await trashItem(id);
    setItems((prev) => prev?.filter((it) => it.id !== id) ?? prev);
  }

  async function handleToggleFav(id: string, next: boolean) {
    await toggleFavorite(id, next);
    setItems((prev) =>
      prev?.map((it) => (it.id === id ? { ...it, is_favorite: next } : it)) ?? prev,
    );
  }

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!items || !filtered) return <p className="text-sm text-zinc-500">Cargando items…</p>;

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3 py-3">
          <Input
            placeholder="Buscar por nombre, usuario, URL, notas…"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          />
          <div className="flex flex-wrap gap-2 text-xs">
            <select
              value={filters.type}
              onChange={(e) =>
                setFilters((f) => ({ ...f, type: e.target.value as VaultItemType | "all" }))
              }
              className="rounded-md border border-zinc-200 bg-transparent p-1 dark:border-zinc-800"
            >
              <option value="all">Todos los tipos</option>
              {(Object.keys(TYPE_LABELS) as VaultItemType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
              className="rounded-md border border-zinc-200 bg-transparent p-1 dark:border-zinc-800"
            >
              <option value="all">Todas las categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={filters.tagId}
              onChange={(e) => setFilters((f) => ({ ...f, tagId: e.target.value }))}
              className="rounded-md border border-zinc-200 bg-transparent p-1 dark:border-zinc-800"
            >
              <option value="all">Todos los tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={filters.onlyFavorites}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, onlyFavorites: e.target.checked }))
                }
              />
              Solo favoritos
            </label>
          </div>
          <p className="text-xs text-zinc-500">
            {filtered.length} / {items.length} items
          </p>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-zinc-500">
            {items.length === 0 ? "Vault vacio. Crea tu primer item." : "Sin resultados."}
          </CardContent>
        </Card>
      ) : null}

      {filtered.map((item) => {
        const p = item.payload as { name?: string; username?: string; url?: string };
        const cat = item.category_id ? categoryNameById.get(item.category_id) : null;
        return (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {p.name ?? "(sin nombre)"}{" "}
                  {item.is_favorite ? <span title="favorito">★</span> : null}
                </CardTitle>
                <p className="text-xs text-zinc-500">
                  {TYPE_LABELS[item.item_type]}
                  {p.username ? ` · ${p.username}` : ""}
                  {p.url ? ` · ${p.url}` : ""}
                  {cat ? ` · ${cat}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleFav(item.id, !item.is_favorite)}
                  className="text-lg leading-none"
                  aria-label={item.is_favorite ? "Quitar favorito" : "Marcar favorito"}
                >
                  {item.is_favorite ? "★" : "☆"}
                </button>
                <Link
                  href={`/vault/${item.id}`}
                  className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  Editar
                </Link>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => handleDelete(item.id)}
                >
                  Papelera
                </Button>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
