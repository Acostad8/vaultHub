"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  IdCard,
  Inbox,
  Key,
  KeyRound,
  Pencil,
  Search,
  ShieldCheck,
  Star,
  Terminal,
  Trash2,
  X,
} from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/card";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import {
  listDecryptedItems,
  toggleFavorite,
  trashItem,
} from "@/services/vault-items";
import { listDecryptedCategories, type DecryptedCategory } from "@/services/categories";
import { fetchItemTagsMap, listDecryptedTags, type DecryptedTag } from "@/services/tags";
import { analyzeVault } from "@/services/vault-analysis";
import { useVaultCache } from "@/store/vault-cache";
import type { VaultItemDecrypted, VaultItemType } from "@/types/vault";
import { DashboardSummary } from "./dashboard-summary";

const TYPE_META: Record<
  VaultItemType,
  { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  password: { label: "Password", icon: KeyRound, accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  note: { label: "Nota", icon: FileText, accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  api_key: { label: "API Key", icon: Key, accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  ssh_key: { label: "SSH", icon: Terminal, accent: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  card: { label: "Tarjeta", icon: CreditCard, accent: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  identity: { label: "Identidad", icon: IdCard, accent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  totp: { label: "TOTP", icon: ShieldCheck, accent: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
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
  const cachedItems = useVaultCache((s) => s.items);
  const cachedCategories = useVaultCache((s) => s.categories);
  const cachedTags = useVaultCache((s) => s.tags);
  const cachedItemTagsMap = useVaultCache((s) => s.itemTagsMap);

  const items = cachedItems;
  const categories = useMemo<DecryptedCategory[]>(
    () => cachedCategories ?? [],
    [cachedCategories],
  );
  const tags = useMemo<DecryptedTag[]>(() => cachedTags ?? [], [cachedTags]);
  const itemTagsMap = useMemo<Map<string, string[]>>(
    () => cachedItemTagsMap ?? new Map(),
    [cachedItemTagsMap],
  );

  const [error, setError] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    query: "",
    type: "all",
    categoryId: "all",
    tagId: "all",
    onlyFavorites: false,
  });

  useEffect(() => {
    let cancelled = false;
    const cache = useVaultCache.getState();
    const needItems = cache.items === null;
    const needCats = cache.categories === null;
    const needTags = cache.tags === null;
    const needTagMap = cache.itemTagsMap === null;
    if (!needItems && !needCats && !needTags && !needTagMap) return;
    (async () => {
      try {
        const [decrypted, cats, tgs, tagMap] = await Promise.all([
          needItems ? listDecryptedItems() : Promise.resolve(cache.items!),
          needCats ? listDecryptedCategories() : Promise.resolve(cache.categories!),
          needTags ? listDecryptedTags() : Promise.resolve(cache.tags!),
          needTagMap ? fetchItemTagsMap() : Promise.resolve(cache.itemTagsMap!),
        ]);
        if (cancelled) return;
        const store = useVaultCache.getState();
        if (needItems) store.setItems(decrypted);
        if (needCats) store.setCategories(cats);
        if (needTags) store.setTags(tgs);
        if (needTagMap) store.setItemTagsMap(tagMap);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "Error"));
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

  const analysis = useMemo(() => (items ? analyzeVault(items) : null), [items]);

  async function handleDelete(id: string) {
    if (!confirm("Enviar a la papelera?")) return;
    await trashItem(id);
    useVaultCache.getState().removeItem(id);
  }

  async function handleToggleFav(id: string, next: boolean) {
    await toggleFavorite(id, next);
    useVaultCache.getState().patchItem(id, { is_favorite: next });
  }

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  function toggleReveal(id: string) {
    setRevealedId((cur) => (cur === id ? null : id));
  }

  async function handleCopy(id: string, password: string) {
    await navigator.clipboard.writeText(password);
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!items || !filtered) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-zinc-500">
        <div className="size-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        Cargando items…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {analysis ? <DashboardSummary analysis={analysis} /> : null}

      <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <InputWithIcon
          placeholder="Buscar por nombre, usuario, URL, notas…"
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          leftIcon={<Search className="size-4" />}
          rightSlot={
            filters.query ? (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, query: "" }))}
                className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label="Limpiar busqueda"
              >
                <X className="size-4" />
              </button>
            ) : undefined
          }
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filters.type}
            onChange={(e) =>
              setFilters((f) => ({ ...f, type: e.target.value as VaultItemType | "all" }))
            }
            className="rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 dark:border-zinc-800"
          >
            <option value="all">Todos los tipos</option>
            {(Object.keys(TYPE_META) as VaultItemType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_META[t].label}
              </option>
            ))}
          </select>
          <select
            value={filters.categoryId}
            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
            className="rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 dark:border-zinc-800"
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
            className="rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 dark:border-zinc-800"
          >
            <option value="all">Todos los tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <label className="ml-auto flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={filters.onlyFavorites}
              onChange={(e) =>
                setFilters((f) => ({ ...f, onlyFavorites: e.target.checked }))
              }
            />
            Solo favoritos
          </label>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {filtered.length} / {items.length}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
              <Inbox className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {items.length === 0 ? "Tu vault esta vacio" : "Sin resultados"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {items.length === 0
                  ? "Crea tu primer item con el boton de arriba."
                  : "Ajusta los filtros o la busqueda."}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <ul className="space-y-2">
        {filtered.map((item) => {
          const p = item.payload as {
            name?: string;
            username?: string;
            url?: string;
            password?: string;
          };
          const cat = item.category_id ? categoryNameById.get(item.category_id) : null;
          const meta = TYPE_META[item.item_type];
          const Icon = meta.icon;
          const revealed = revealedId === item.id;
          const copied = copiedId === item.id;
          const hasPassword = typeof p.password === "string" && p.password.length > 0;
          return (
            <li key={item.id}>
              <Card className="group transition-colors hover:border-zinc-300 dark:hover:border-zinc-700">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.accent}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {p.name ?? "(sin nombre)"}
                      </span>
                      {item.is_favorite ? (
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {meta.label}
                      {p.username ? <> · {p.username}</> : null}
                      {p.url ? <> · {p.url}</> : null}
                      {cat ? <> · {cat}</> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                    {hasPassword ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleReveal(item.id)}
                          className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          aria-label={revealed ? "Ocultar password" : "Ver password"}
                          title={revealed ? "Ocultar password" : "Ver password"}
                        >
                          {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, p.password!)}
                          className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          aria-label={copied ? "Copiado" : "Copiar password"}
                          title={copied ? "Copiado" : "Copiar password"}
                        >
                          {copied ? (
                            <Check className="size-4 text-emerald-500" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleToggleFav(item.id, !item.is_favorite)}
                      className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-amber-500 dark:hover:bg-zinc-800"
                      aria-label={item.is_favorite ? "Quitar favorito" : "Marcar favorito"}
                      title={item.is_favorite ? "Quitar favorito" : "Marcar favorito"}
                    >
                      <Star
                        className={`size-4 ${item.is_favorite ? "fill-amber-400 text-amber-400" : ""}`}
                      />
                    </button>
                    <Link
                      href={`/vault/${item.id}`}
                      className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      aria-label="Editar"
                      title="Editar"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-md p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      aria-label="Enviar a papelera"
                      title="Enviar a papelera"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                {revealed && hasPassword ? (
                  <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                      Password
                    </p>
                    <p className="font-mono text-sm break-all text-zinc-900 dark:text-zinc-100">
                      {p.password}
                    </p>
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
