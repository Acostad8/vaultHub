"use client";

import { errorMessage } from "@/lib/errors";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createItem, editItem } from "@/services/vault-items";
import { assignTagsToItem, fetchItemTagsMap } from "@/services/tags";
import { checkHibp, generatePassword, evaluatePasswordStrength } from "@/lib/password";
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
  const [hibpState, setHibpState] = useState<
    | { state: "idle" }
    | { state: "loading" }
    | { state: "safe" }
    | { state: "breached"; count: number }
    | { state: "error"; message: string }
  >({ state: "idle" });

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
    setHibpState({ state: "idle" });
  }

  async function handleCheckHibp() {
    if (!password) return;
    setHibpState({ state: "loading" });
    try {
      const r = await checkHibp(password);
      if (r.breached) setHibpState({ state: "breached", count: r.count });
      else setHibpState({ state: "safe" });
    } catch (err) {
      setHibpState({ state: "error", message: errorMessage(err, "HIBP no disponible") });
    }
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
      setServerError(errorMessage(err, "Error guardando"));
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
          <div className="flex gap-1.5">
            <Button type="button" size="xs" variant="outline" onClick={handleGenerate}>
              Generar
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={handleCheckHibp}
              disabled={!password || hibpState.state === "loading"}
            >
              {hibpState.state === "loading" ? "Chequeando…" : "Chequear HIBP"}
            </Button>
          </div>
        </div>
        <Input id="password" type="text" {...register("password")} />
        {strength ? (
          <p className="text-xs text-zinc-500">
            {strength.label} · {strength.entropyBits.toFixed(0)} bits · {strength.crackDisplay}
          </p>
        ) : null}
        {hibpState.state === "safe" ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            No aparece en breaches conocidos.
          </p>
        ) : null}
        {hibpState.state === "breached" ? (
          <p className="text-xs text-red-600 dark:text-red-400">
            Comprometido: aparece {hibpState.count.toLocaleString()} veces en HIBP.
          </p>
        ) : null}
        {hibpState.state === "error" ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">{hibpState.message}</p>
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
