"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VaultGate } from "@/components/vault/vault-gate";
import {
  createCategory,
  listDecryptedCategories,
  removeCategory,
  renameCategory,
  type DecryptedCategory,
} from "@/services/categories";
import { categorySchema, type CategoryInput } from "@/validators/vault";

function CategoriesInner() {
  const [items, setItems] = useState<DecryptedCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  useEffect(() => {
    let cancelled = false;
    listDecryptedCategories()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(values: CategoryInput) {
    await createCategory({ name: values.name, color: values.color || null });
    reset({ name: "", color: "" });
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
    if (!confirm("Borrar esta categoria? Los items se quedan sin categoria.")) return;
    await removeCategory(id);
    void reload();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorias</h1>
        <Link href="/" className="text-sm text-zinc-500 underline underline-offset-4">
          Volver
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 sm:flex-row" noValidate>
            <div className="flex-1 space-y-1">
              <Label htmlFor="name" className="sr-only">
                Nombre
              </Label>
              <Input id="name" placeholder="Nombre" {...register("name")} />
              {errors.name ? (
                <p className="text-xs text-red-600">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="w-full sm:w-40 space-y-1">
              <Label htmlFor="color" className="sr-only">
                Color
              </Label>
              <Input id="color" placeholder="#7c3aed" {...register("color")} />
              {errors.color ? (
                <p className="text-xs text-red-600">{errors.color.message}</p>
              ) : null}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              Crear
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!items ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
      {items && items.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay categorias todavia.</p>
      ) : null}

      {items?.map((cat) => (
        <Card key={cat.id}>
          <CardContent className="flex items-center gap-3 py-3">
            {cat.color ? (
              <span className="h-4 w-4 rounded" style={{ backgroundColor: cat.color }} />
            ) : null}
            {editingId === cat.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={() => handleRename(cat.id)}>
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setEditName("");
                  }}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1">{cat.name}</span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    setEditingId(cat.id);
                    setEditName(cat.name);
                  }}
                >
                  Renombrar
                </Button>
                <Button size="xs" variant="destructive" onClick={() => handleDelete(cat.id)}>
                  Borrar
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ))}
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
