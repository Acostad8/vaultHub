"use client";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createItem, editItem } from "@/services/vault-items";
import { assignTagsToItem, fetchItemTagsMap } from "@/services/tags";
import {
  apiKeyItemSchema,
  cardItemSchema,
  identityItemSchema,
  noteItemSchema,
  sshKeyItemSchema,
  totpItemSchema,
  type ApiKeyItemInput,
  type CardItemInput,
  type IdentityItemInput,
  type NoteItemInput,
  type SshKeyItemInput,
  type TotpItemInput,
} from "@/validators/vault";
import type {
  ApiKeyPayload,
  CardPayload,
  IdentityPayload,
  NotePayload,
  SshKeyPayload,
  TotpPayload,
  VaultItemDecrypted,
  VaultItemPayload,
  VaultItemType,
} from "@/types/vault";
import { ItemMetaFields } from "./item-meta-fields";

// ---------------------------------------------------------------------
// Wrapper generico: toma un schema Zod + defaults + una funcion que
// convierte el input del form al payload del vault, y ademas render de
// campos custom. Encapsula el manejo de meta (category/tags/favorito).
// ---------------------------------------------------------------------

interface WrapperProps<TInput extends FieldValues, TPayload extends VaultItemPayload> {
  mode: "create" | "edit";
  itemType: VaultItemType;
  schema: ZodType<TInput>;
  defaults: DefaultValues<TInput>;
  existing?: VaultItemDecrypted<TPayload>;
  toPayload: (values: TInput) => TPayload;
  renderFields: (form: UseFormReturn<TInput>) => React.ReactNode;
}

function ItemFormWrapper<TInput extends FieldValues, TPayload extends VaultItemPayload>({
  mode,
  itemType,
  schema,
  defaults,
  existing,
  toPayload,
  renderFields,
}: WrapperProps<TInput, TPayload>) {
  const router = useRouter();
  const form = useForm<TInput>({
    // Cast: la mezcla de generics de Zod v4 + RHF v7 no matchea de forma
    // exacta con schemas genericos, pero el resolver funciona en runtime.
    // Cast puntual acotado a este wrapper.
    resolver: (zodResolver as unknown as (s: unknown) => Resolver<TInput>)(schema),
    defaultValues: defaults,
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState<boolean>(existing?.is_favorite ?? false);

  useEffect(() => {
    if (mode !== "edit" || !existing) return;
    let cancelled = false;
    fetchItemTagsMap()
      .then((map) => {
        if (!cancelled) setTagIds(map.get(existing.id) ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [existing, mode]);

  async function onSubmit(values: TInput) {
    setServerError(null);
    const payload = toPayload(values);
    try {
      let itemId: string;
      if (mode === "create") {
        const created = await createItem({
          item_type: itemType,
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
      toast.success(mode === "create" ? "Item creado" : "Cambios guardados");
      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(errorMessage(err, "Error guardando"));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {renderFields(form)}
      <ItemMetaFields
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        tagIds={tagIds}
        onTagsChange={setTagIds}
        isFavorite={isFavorite}
        onFavoriteChange={setIsFavorite}
      />
      {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------
// NOTE
// ---------------------------------------------------------------------

export function NoteItemForm({
  mode,
  existing,
}: {
  mode: "create" | "edit";
  existing?: VaultItemDecrypted<NotePayload>;
}) {
  return (
    <ItemFormWrapper<NoteItemInput, NotePayload>
      mode={mode}
      itemType="note"
      schema={noteItemSchema}
      defaults={{ name: existing?.payload.name ?? "", body: existing?.payload.body ?? "" }}
      existing={existing}
      toPayload={(v) => ({ name: v.name, body: v.body })}
      renderFields={(form) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="name">Titulo</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Contenido</Label>
            <textarea
              id="body"
              {...form.register("body")}
              className="min-h-48 w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-800"
            />
          </div>
        </>
      )}
    />
  );
}

// ---------------------------------------------------------------------
// API KEY
// ---------------------------------------------------------------------

export function ApiKeyItemForm({
  mode,
  existing,
}: {
  mode: "create" | "edit";
  existing?: VaultItemDecrypted<ApiKeyPayload>;
}) {
  return (
    <ItemFormWrapper<ApiKeyItemInput, ApiKeyPayload>
      mode={mode}
      itemType="api_key"
      schema={apiKeyItemSchema}
      defaults={{
        name: existing?.payload.name ?? "",
        key: existing?.payload.key ?? "",
        notes: existing?.payload.notes ?? "",
      }}
      existing={existing}
      toPayload={(v) => ({ name: v.name, key: v.key, notes: v.notes || undefined })}
      renderFields={(form) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="key">API Key / Token</Label>
            <textarea
              id="key"
              {...form.register("key")}
              className="min-h-20 w-full rounded-md border border-zinc-200 bg-transparent p-2 font-mono text-xs dark:border-zinc-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              {...form.register("notes")}
              className="min-h-16 w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-800"
            />
          </div>
        </>
      )}
    />
  );
}

// ---------------------------------------------------------------------
// SSH KEY
// ---------------------------------------------------------------------

export function SshKeyItemForm({
  mode,
  existing,
}: {
  mode: "create" | "edit";
  existing?: VaultItemDecrypted<SshKeyPayload>;
}) {
  return (
    <ItemFormWrapper<SshKeyItemInput, SshKeyPayload>
      mode={mode}
      itemType="ssh_key"
      schema={sshKeyItemSchema}
      defaults={{
        name: existing?.payload.name ?? "",
        private_key: existing?.payload.private_key ?? "",
        public_key: existing?.payload.public_key ?? "",
        passphrase: existing?.payload.passphrase ?? "",
        notes: existing?.payload.notes ?? "",
      }}
      existing={existing}
      toPayload={(v) => ({
        name: v.name,
        private_key: v.private_key,
        public_key: v.public_key || undefined,
        passphrase: v.passphrase || undefined,
        notes: v.notes || undefined,
      })}
      renderFields={(form) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="private_key">Clave privada</Label>
            <textarea
              id="private_key"
              {...form.register("private_key")}
              className="min-h-48 w-full rounded-md border border-zinc-200 bg-transparent p-2 font-mono text-xs dark:border-zinc-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="public_key">Clave publica</Label>
            <textarea
              id="public_key"
              {...form.register("public_key")}
              className="min-h-20 w-full rounded-md border border-zinc-200 bg-transparent p-2 font-mono text-xs dark:border-zinc-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passphrase">Passphrase</Label>
            <Input id="passphrase" type="password" {...form.register("passphrase")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              {...form.register("notes")}
              className="min-h-16 w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-800"
            />
          </div>
        </>
      )}
    />
  );
}

// ---------------------------------------------------------------------
// CARD
// ---------------------------------------------------------------------

export function CardItemForm({
  mode,
  existing,
}: {
  mode: "create" | "edit";
  existing?: VaultItemDecrypted<CardPayload>;
}) {
  return (
    <ItemFormWrapper<CardItemInput, CardPayload>
      mode={mode}
      itemType="card"
      schema={cardItemSchema}
      defaults={{
        name: existing?.payload.name ?? "",
        cardholder: existing?.payload.cardholder ?? "",
        number: existing?.payload.number ?? "",
        exp_month: existing?.payload.exp_month ?? "",
        exp_year: existing?.payload.exp_year ?? "",
        cvv: existing?.payload.cvv ?? "",
        notes: existing?.payload.notes ?? "",
      }}
      existing={existing}
      toPayload={(v) => ({
        name: v.name,
        cardholder: v.cardholder,
        number: v.number,
        exp_month: v.exp_month,
        exp_year: v.exp_year,
        cvv: v.cvv || undefined,
        notes: v.notes || undefined,
      })}
      renderFields={(form) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardholder">Titular</Label>
            <Input id="cardholder" {...form.register("cardholder")} />
            {form.formState.errors.cardholder ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.cardholder.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Numero</Label>
            <Input id="number" inputMode="numeric" {...form.register("number")} />
            {form.formState.errors.number ? (
              <p className="text-sm text-red-600">{form.formState.errors.number.message}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="exp_month">Mes exp</Label>
              <Input id="exp_month" inputMode="numeric" {...form.register("exp_month")} />
              {form.formState.errors.exp_month ? (
                <p className="text-sm text-red-600">
                  {form.formState.errors.exp_month.message}
                </p>
              ) : null}
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="exp_year">Ano exp</Label>
              <Input id="exp_year" inputMode="numeric" {...form.register("exp_year")} />
              {form.formState.errors.exp_year ? (
                <p className="text-sm text-red-600">
                  {form.formState.errors.exp_year.message}
                </p>
              ) : null}
            </div>
            <div className="w-24 space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input id="cvv" inputMode="numeric" {...form.register("cvv")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              {...form.register("notes")}
              className="min-h-16 w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-800"
            />
          </div>
        </>
      )}
    />
  );
}

// ---------------------------------------------------------------------
// IDENTITY
// ---------------------------------------------------------------------

export function IdentityItemForm({
  mode,
  existing,
}: {
  mode: "create" | "edit";
  existing?: VaultItemDecrypted<IdentityPayload>;
}) {
  return (
    <ItemFormWrapper<IdentityItemInput, IdentityPayload>
      mode={mode}
      itemType="identity"
      schema={identityItemSchema}
      defaults={{
        name: existing?.payload.name ?? "",
        full_name: existing?.payload.full_name ?? "",
        document_number: existing?.payload.document_number ?? "",
        birth_date: existing?.payload.birth_date ?? "",
        address: existing?.payload.address ?? "",
        notes: existing?.payload.notes ?? "",
      }}
      existing={existing}
      toPayload={(v) => ({
        name: v.name,
        full_name: v.full_name || undefined,
        document_number: v.document_number || undefined,
        birth_date: v.birth_date || undefined,
        address: v.address || undefined,
        notes: v.notes || undefined,
      })}
      renderFields={(form) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del registro</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input id="full_name" {...form.register("full_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document_number">Documento</Label>
            <Input id="document_number" {...form.register("document_number")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth_date">Fecha nacimiento</Label>
            <Input id="birth_date" placeholder="AAAA-MM-DD" {...form.register("birth_date")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Direccion</Label>
            <textarea
              id="address"
              {...form.register("address")}
              className="min-h-16 w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-800"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              {...form.register("notes")}
              className="min-h-16 w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-800"
            />
          </div>
        </>
      )}
    />
  );
}

// ---------------------------------------------------------------------
// TOTP
// ---------------------------------------------------------------------

export function TotpItemForm({
  mode,
  existing,
}: {
  mode: "create" | "edit";
  existing?: VaultItemDecrypted<TotpPayload>;
}) {
  return (
    <ItemFormWrapper<TotpItemInput, TotpPayload>
      mode={mode}
      itemType="totp"
      schema={totpItemSchema}
      defaults={{
        name: existing?.payload.name ?? "",
        secret: existing?.payload.secret ?? "",
        issuer: existing?.payload.issuer ?? "",
      }}
      existing={existing}
      toPayload={(v) => ({ name: v.name, secret: v.secret, issuer: v.issuer || undefined })}
      renderFields={(form) => (
        <>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuer">Issuer</Label>
            <Input id="issuer" {...form.register("issuer")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secret">Secret (base32)</Label>
            <Input id="secret" {...form.register("secret")} className="font-mono" />
            {form.formState.errors.secret ? (
              <p className="text-sm text-red-600">{form.formState.errors.secret.message}</p>
            ) : null}
          </div>
        </>
      )}
    />
  );
}
