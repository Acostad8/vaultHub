"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Folder, GripVertical, Plus } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { VaultGate } from "@/components/vault/vault-gate";
import { SortableCategoryItem } from "@/components/vault/sortable-category-item";
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
  createCategory,
  listDecryptedCategories,
  removeCategory,
  renameCategory,
  reorderCategories,
  type DecryptedCategory,
} from "@/services/categories";
import { categorySchema, type CategoryInput } from "@/validators/vault";
import { useVaultCache } from "@/store/vault-cache";

function CategoriesInner() {
  const confirm = useConfirm();
  const cachedItems = useVaultCache((s) => s.items);
  const [items, setItems] = useState<DecryptedCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Count de items por categoria (client-side sobre cache). Se muestra en la
  // card sortable para dar contexto sin un extra roundtrip.
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    if (!cachedItems) return map;
    for (const it of cachedItems) {
      if (!it.category_id) continue;
      map.set(it.category_id, (map.get(it.category_id) ?? 0) + 1);
    }
    return map;
  }, [cachedItems]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [color, setColor] = useState("");
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", color: "" },
  });

  async function reload() {
    setError(null);
    try {
      setItems(await listDecryptedCategories());
    } catch (err) {
      setError(errorMessage(err, "Error"));
    }
  }

  useEffect(() => {
    let cancelled = false;
    listDecryptedCategories()
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

  async function onSubmit(values: CategoryInput) {
    await createCategory({ name: values.name, color: color || null });
    reset({ name: "", color: "" });
    setColor("");
    void reload();
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    await renameCategory(id, editName.trim());
    setEditingId(null);
    setEditName("");
    void reload();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Borrar esta categoria?",
      description: "Los items se quedan sin categoria (no se borran).",
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeCategory(id);
      toast.success("Categoria borrada");
      void reload();
    } catch (err) {
      toast.error(errorMessage(err, "Error borrando"));
    }
  }

  async function persistOrder(previous: DecryptedCategory[], next: DecryptedCategory[]) {
    const ids = next.map((c) => c.id);
    setPendingOrder(previous.map((c) => c.id));
    try {
      await reorderCategories(ids);
      setPendingOrder(null);
    } catch (err) {
      setItems(previous);
      setPendingOrder(null);
      toast.error(errorMessage(err, "Error reordenando"));
    }
  }

  function moveByIndex(from: number, to: number) {
    if (!items) return;
    if (from === to || to < 0 || to >= items.length) return;
    const next = arrayMove(items, from, to).map((c, idx) => ({ ...c, sort_order: idx }));
    const prev = items;
    setItems(next);
    void persistOrder(prev, next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !items) return;
    const from = items.findIndex((c) => c.id === active.id);
    const to = items.findIndex((c) => c.id === over.id);
    if (from < 0 || to < 0) return;
    moveByIndex(from, to);
  }

  return (
    <ModuleShell
      footerNote="nombres cifrados con tu master key"
      hero={
        <ModuleHero
          eyebrow="vault.categories"
          title="Categorias"
          description="Organiza tus items en carpetas. Arrastra o usa ↑↓ para reordenar."
          badge={{ icon: Folder, label: `${items?.length ?? 0} activas` }}
        />
      }
    >
      <ModuleCard>
        <ModuleSectionHeader
          title="crear categoria"
          hint="Nombre + color opcional. Se cifra localmente."
        />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Nombre
              </Label>
              <InputWithIcon
                id="name"
                placeholder="Trabajo, banco, redes…"
                leftIcon={<Folder className="size-4" />}
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

      <ModuleCard>
        <ModuleSectionHeader
          title="lista"
          hint="Reordenar por drag & drop o teclado (↑↓ tras enfocar el handle)."
          right={
            items && items.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <GripVertical className="size-3" />
                {items.length}
              </span>
            ) : null
          }
        />
        <div className="p-4">
          {error ? <ErrorBanner message={error} /> : null}
          {!items ? <LoadingHint text="cargando categorias" /> : null}
          {items && items.length === 0 ? (
            <EmptyState
              icon={<Folder className="size-6" />}
              title="Sin categorias todavia"
              hint="Crea la primera arriba."
            />
          ) : null}

          {items && items.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul
                  className="space-y-2"
                  aria-label="Lista de categorias reordenables"
                  aria-busy={pendingOrder !== null || undefined}
                >
                  {items.map((cat, index) => (
                    <SortableCategoryItem
                      key={cat.id}
                      category={cat}
                      itemCount={itemsByCategory.get(cat.id) ?? 0}
                      editing={editingId === cat.id}
                      editName={editName}
                      onEditNameChange={setEditName}
                      onStartEdit={() => {
                        setEditingId(cat.id);
                        setEditName(cat.name);
                      }}
                      onCancelEdit={() => {
                        setEditingId(null);
                        setEditName("");
                      }}
                      onSaveEdit={() => handleRename(cat.id)}
                      onDelete={() => handleDelete(cat.id)}
                      onKeyboardMove={(delta) => moveByIndex(index, index + delta)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          ) : null}
        </div>
      </ModuleCard>
    </ModuleShell>
  );
}

export default function CategoriesPage() {
  return (
    <VaultGate>
      <CategoriesInner />
    </VaultGate>
  );
}
