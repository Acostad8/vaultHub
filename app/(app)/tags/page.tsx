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
  createTag,
  listDecryptedTags,
  removeTag,
  renameTag,
  type DecryptedTag,
} from "@/services/tags";
import { tagSchema, type TagInput } from "@/validators/vault";

function TagsInner() {
  const [items, setItems] = useState<DecryptedTag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  useEffect(() => {
    let cancelled = false;
    listDecryptedTags()
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

  async function onSubmit(values: TagInput) {
    await createTag({ name: values.name, color: values.color || null });
    reset({ name: "", color: "" });
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
    if (!confirm("Borrar este tag? Se quita de todos los items.")) return;
    await removeTag(id);
    void reload();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tags</h1>
        <Link href="/" className="text-sm text-zinc-500 underline underline-offset-4">
          Volver
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuevo tag</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 sm:flex-row" noValidate>
            <div className="flex-1 space-y-1">
              <Label htmlFor="name" className="sr-only">
                Nombre
              </Label>
              <Input id="name" placeholder="Nombre" {...register("name")} />
              {errors.name ? <p className="text-xs text-red-600">{errors.name.message}</p> : null}
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
        <p className="text-sm text-zinc-500">No hay tags todavia.</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {items?.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-800"
          >
            {tag.color ? (
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
            ) : null}
            {editingId === tag.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-6 w-32 px-1 text-xs"
                />
                <button
                  className="text-xs text-blue-600 underline"
                  onClick={() => handleRename(tag.id)}
                >
                  ok
                </button>
                <button
                  className="text-xs text-zinc-500"
                  onClick={() => {
                    setEditingId(null);
                    setEditName("");
                  }}
                >
                  x
                </button>
              </>
            ) : (
              <>
                <span>{tag.name}</span>
                <button
                  className="text-xs text-zinc-500"
                  onClick={() => {
                    setEditingId(tag.id);
                    setEditName(tag.name);
                  }}
                >
                  ✎
                </button>
                <button className="text-xs text-red-600" onClick={() => handleDelete(tag.id)}>
                  ×
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TagsPage() {
  return (
    <VaultGate>
      <TagsInner />
    </VaultGate>
  );
}
