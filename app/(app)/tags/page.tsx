"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus, Tag as TagIcon, X } from "lucide-react";

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
  createTag,
  listDecryptedTags,
  removeTag,
  renameTag,
  type DecryptedTag,
} from "@/services/tags";
import { tagSchema, type TagInput } from "@/validators/vault";

function TagsInner() {
  const confirm = useConfirm();
  const [items, setItems] = useState<DecryptedTag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [color, setColor] = useState("");

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
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        title="Tags"
        description="Etiquetas transversales para clasificar items. Nombre cifrado."
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
                placeholder="importante, personal…"
                leftIcon={<TagIcon className="size-4" />}
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
          Sin tags todavia.
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {items?.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: tag.color ?? "#a1a1aa" }}
            />
            {editingId === tag.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-6 w-36 px-1.5 text-xs"
                  autoFocus
                />
                <button
                  className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  onClick={() => handleRename(tag.id)}
                  aria-label="Guardar"
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  className="rounded p-0.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setEditingId(null);
                    setEditName("");
                  }}
                  aria-label="Cancelar"
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="font-medium">{tag.name}</span>
                <button
                  className="rounded p-0.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setEditingId(tag.id);
                    setEditName(tag.name);
                  }}
                  aria-label="Renombrar"
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  className="rounded p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => handleDelete(tag.id)}
                  aria-label="Borrar"
                >
                  <X className="size-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Icono Pencil pequeño reutilizado.
function Pencil({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

export default function TagsPage() {
  return (
    <VaultGate>
      <TagsInner />
    </VaultGate>
  );
}
