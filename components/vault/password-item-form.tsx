"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createItem, editItem } from "@/services/vault-items";
import { assignTagsToItem, fetchItemTagsMap } from "@/services/tags";
import { generatePassword, evaluatePasswordStrength } from "@/lib/password";
import { passwordItemSchema, type PasswordItemInput } from "@/validators/vault";
import type { PasswordPayload, VaultItemDecrypted } from "@/types/vault";
import { ItemMetaFields } from "./item-meta-fields";

interface Props {
  mode: "create" | "edit";
  existing?: VaultItemDecrypted<PasswordPayload>;
}

export function PasswordItemForm({ mode, existing }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState<boolean>(existing?.is_favorite ?? false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PasswordItemInput>({
    resolver: zodResolver(passwordItemSchema),
    defaultValues: {
      name: existing?.payload.name ?? "",
      url: existing?.payload.url ?? "",
      username: existing?.payload.username ?? "",
      password: existing?.payload.password ?? "",
      notes: existing?.payload.notes ?? "",
    },
  });

  const password = watch("password");
  const strength = password ? evaluatePasswordStrength(password) : null;

  useEffect(() => {
    if (mode !== "edit" || !existing) return;
    let cancelled = false;
    fetchItemTagsMap()
      .then((map) => {
        if (!cancelled) setTagIds(map.get(existing.id) ?? []);
      })
      .catch(() => {
        // no fatal
      });
    return () => {
      cancelled = true;
    };
  }, [existing, mode]);

  function handleGenerate() {
    const generated = generatePassword({ length: 20 });
    setValue("password", generated, { shouldValidate: true });
  }

  async function onSubmit(values: PasswordItemInput) {
    setServerError(null);
    const payload: PasswordPayload = {
      name: values.name,
      url: values.url || undefined,
      username: values.username || undefined,
      password: values.password || undefined,
      notes: values.notes || undefined,
    };
    try {
      let itemId: string;
      if (mode === "create") {
        const created = await createItem({
          item_type: "password",
          payload,
          category_id: categoryId,
          is_favorite: isFavorite,
        });
        itemId = created.id;
      } else if (existing) {
        const updated = await editItem({
          id: existing.id,
          payload,
          category_id: categoryId,
          is_favorite: isFavorite,
        });
        itemId = updated.id;
      } else {
        return;
      }
      await assignTagsToItem(itemId, tagIds);
      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Error guardando");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" {...register("name")} />
        {errors.name ? <p className="text-sm text-red-600">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input id="url" {...register("url")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Usuario</Label>
        <Input id="username" {...register("username")} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Button type="button" size="xs" variant="outline" onClick={handleGenerate}>
            Generar
          </Button>
        </div>
        <Input id="password" type="text" {...register("password")} />
        {strength ? (
          <p className="text-xs text-zinc-500">
            {strength.label} · {strength.entropyBits.toFixed(0)} bits · {strength.crackDisplay}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <textarea
          id="notes"
          {...register("notes")}
          className="min-h-24 w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-800"
        />
      </div>
      <ItemMetaFields
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        tagIds={tagIds}
        onTagsChange={setTagIds}
        isFavorite={isFavorite}
        onFavoriteChange={setIsFavorite}
      />
      {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
      </Button>
    </form>
  );
}
