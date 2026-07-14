"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, Pencil, Plus, Search, Tag as TagIcon, X } from "lucide-react";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { Input } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { VaultGate } from "@/components/vault/vault-gate";
import {
  EmptyState,
  ErrorBanner,
  LoadingHint,
  ModuleCard,
  ModuleHero,
  ModuleSectionHeader,
  ModuleShell,
} from "@/components/vault/module-shell";
import {
  createTag,
  listDecryptedTags,
  removeTag,
  renameTag,
  type DecryptedTag,
} from "@/services/tags";
import { tagSchema, type TagInput } from "@/validators/vault";
import { useVaultCache } from "@/store/vault-cache";

function TagsInner() {
  const confirm = useConfirm();
  const cachedItemTagsMap = useVaultCache((s) => s.itemTagsMap);
  const [items, setItems] = useState<DecryptedTag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [color, setColor] = useState("");
  const [query, setQuery] = useState("");

  // Cuenta cuantos items usan cada tag. Client-side sobre el cache existente.
  const countByTag = useMemo(() => {
    const map = new Map<string, number>();
    if (!cachedItemTagsMap) return map;
    for (const tagIds of cachedItemTagsMap.values()) {
      for (const tid of tagIds) map.set(tid, (map.get(tid) ?? 0) + 1);
    }
    return map;
  }, [cachedItemTagsMap]);

  // Filtrado por query. Case-insensitive sobre el nombre desencriptado.
  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((t) => t.name.toLowerCase().includes(q));
  }, [items, query]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TagInput>({
    resolver: zodResolver(tagSchema),
    defaultValues: { name: "", color: "" },
  });

  async function reload() {
    setError(null);
    try {
      setItems(await listDecryptedTags());
    } catch (err) {
      setError(errorMessage(err, "Error"));
    }
  }

  useEffect(() => {
    let cancelled = false;
    listDecryptedTags()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Error"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(values: TagInput) {
    await createTag({ name: values.name, color: color || null });
    reset({ name: "", color: "" });
    setColor("");
    void reload();
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    await renameTag(id, editName.trim());
    setEditingId(null);
    setEditName("");
    void reload();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Borrar este tag?",
      description: "Se quita de todos los items que lo usan.",
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeTag(id);
      toast.success("Tag borrado");
      void reload();
    } catch (err) {
      toast.error(errorMessage(err, "Error borrando"));
    }
  }

  return (
    <ModuleShell
      footerNote="nombres cifrados con tu master key"
      hero={
        <ModuleHero
          eyebrow="vault.tags"
          title="Tags"
          description="Etiquetas transversales para clasificar items — un mismo tag puede vivir en varias categorias."
          badge={{ icon: TagIcon, label: `${items?.length ?? 0} activos` }}
        />
      }
    >
      {/* Crear */}
      <ModuleCard>
        <ModuleSectionHeader
          title="crear tag"
          hint="Nombre + color opcional. Un tag puede reutilizarse en muchos items."
        />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Nombre
              </Label>
              <InputWithIcon
                id="name"
                placeholder="importante, personal, trabajo…"
                leftIcon={<TagIcon className="size-4" />}
                {...register("name")}
              />
              {errors.name ? (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="size-3" />
                  {errors.name.message}
                </p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-5 text-sm font-medium text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              <Plus className="size-4" />
              Crear
            </button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Color</Label>
            <ColorSwatchPicker value={color} onChange={setColor} disabled={isSubmitting} />
          </div>
        </form>
      </ModuleCard>

      {/* Lista */}
      <ModuleCard>
        <ModuleSectionHeader
          title="lista"
          hint="Cada tag muestra cuantos items lo usan. Borrar lo quita de todos ellos."
          right={
            items && items.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {filtered?.length ?? 0} / {items.length}
              </span>
            ) : null
          }
        />
        <div className="space-y-4 p-4">
          {/* Search inline (solo si hay varios) */}
          {items && items.length > 5 ? (
            <InputWithIcon
              placeholder="Buscar tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={<Search className="size-4" />}
              rightSlot={
                query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    aria-label="Limpiar busqueda"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : undefined
              }
            />
          ) : null}

          {error ? <ErrorBanner message={error} /> : null}
          {!items ? <LoadingHint text="cargando tags" /> : null}
          {items && items.length === 0 ? (
            <EmptyState
              icon={<TagIcon className="size-6" />}
              title="Sin tags todavia"
              hint="Crea el primero arriba para empezar a etiquetar items."
            />
          ) : null}
          {items && items.length > 0 && filtered && filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="size-6" />}
              title="Sin resultados"
              hint={`Ningun tag coincide con "${query}".`}
            />
          ) : null}

          {filtered && filtered.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {filtered.map((tag) => {
                const editing = editingId === tag.id;
                const count = countByTag.get(tag.id) ?? 0;
                const accent = tag.color ?? "#a1a1aa";
                return (
                  <li key={tag.id}>
                    <article
                      className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-sm transition-all hover:-translate-y-px hover:border-emerald-400/60 hover:shadow dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-emerald-500/40"
                      style={{ borderLeftWidth: "3px", borderLeftColor: accent }}
                    >
                      <span
                        className="inline-block size-4 shrink-0 rounded-md ring-2 ring-white dark:ring-zinc-900"
                        style={{ backgroundColor: accent }}
                        aria-hidden
                      />
                      {editing ? (
                        <>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleRename(tag.id);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                setEditingId(null);
                                setEditName("");
                              }
                            }}
                            className="h-8 flex-1 text-sm"
                            autoFocus
                          />
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                            onClick={() => handleRename(tag.id)}
                            aria-label="Guardar"
                            title="Guardar"
                          >
                            <Check className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                            onClick={() => {
                              setEditingId(null);
                              setEditName("");
                            }}
                            aria-label="Cancelar"
                            title="Cancelar"
                          >
                            <X className="size-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {tag.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                              {count} {count === 1 ? "item" : "items"}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-zinc-400 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-900 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            onClick={() => {
                              setEditingId(tag.id);
                              setEditName(tag.name);
                            }}
                            aria-label="Renombrar"
                            title="Renombrar"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-zinc-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            onClick={() => handleDelete(tag.id)}
                            aria-label="Borrar"
                            title="Borrar"
                          >
                            <X className="size-3.5" />
                          </button>
                        </>
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </ModuleCard>
    </ModuleShell>
  );
}

export default function TagsPage() {
  return (
    <VaultGate>
      <TagsInner />
    </VaultGate>
  );
}
