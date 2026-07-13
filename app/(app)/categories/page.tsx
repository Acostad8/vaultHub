"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Folder, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { VaultGate } from "@/components/vault/vault-gate";
import { PageHeader } from "@/components/vault/page-header";
import { SortableCategoryItem } from "@/components/vault/sortable-category-item";
import {
  createCategory,
  listDecryptedCategories,
  removeCategory,
  renameCategory,
  reorderCategories,
  type DecryptedCategory,
} from "@/services/categories";
import { categorySchema, type CategoryInput } from "@/validators/vault";

function CategoriesInner() {
  const confirm = useConfirm();
  const [items, setItems] = useState<DecryptedCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [color, setColor] = useState("");
  // Copia local del orden previo — para rollback si el batch update falla.
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
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        title="Categorias"
        description="Organiza tus items en carpetas. Arrastra o usa ↑↓ para reordenar. El nombre se cifra localmente."
      />

      <Card className="mb-4 p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">
                Nombre
              </Label>
              <InputWithIcon
                id="name"
                placeholder="Trabajo, banco, redes…"
                leftIcon={<Folder className="size-4" />}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-xs text-red-600">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full gap-1.5 sm:w-auto" disabled={isSubmitting}>
                <Plus className="size-4" />
                Crear
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Color</Label>
            <ColorSwatchPicker value={color} onChange={setColor} disabled={isSubmitting} />
          </div>
        </form>
      </Card>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!items ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
      {items && items.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-sm text-zinc-500">
          Sin categorias todavia.
        </Card>
      ) : null}

      {items && items.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul
              className="space-y-2"
              aria-label="Lista de categorias reordenables"
              aria-busy={pendingOrder !== null || undefined}
            >
              {items.map((cat, index) => (
                <SortableCategoryItem
                  key={cat.id}
                  category={cat}
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
  );
}

export default function CategoriesPage() {
  return (
    <VaultGate>
      <CategoriesInner />
    </VaultGate>
  );
}
