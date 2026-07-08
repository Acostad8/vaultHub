"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Folder, Pencil, Plus, Trash2, X } from "lucide-react";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ColorSwatchPicker } from "@/components/ui/color-swatch-picker";
import { Input } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { VaultGate } from "@/components/vault/vault-gate";
import { PageHeader } from "@/components/vault/page-header";
import {
  createCategory,
  listDecryptedCategories,
  removeCategory,
  renameCategory,
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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        title="Categorias"
        description="Organiza tus items en carpetas. El nombre se cifra localmente."
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

      <ul className="space-y-2">
        {items?.map((cat) => (
          <li key={cat.id}>
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: cat.color ?? "#e4e4e7" }}
                >
                  <Folder className="size-4 text-white/95" />
                </div>

                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleRename(cat.id)} className="gap-1">
                      <Check className="size-3.5" />
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditName("");
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditName(cat.name);
                      }}
                      className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      title="Renombrar"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      className="rounded-md p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      title="Borrar"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
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
