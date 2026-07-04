"use client";

import { errorMessage } from "@/lib/errors";

import Link from "next/link";
import { useEffect, useState, use } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VaultGate } from "@/components/vault/vault-gate";
import { PasswordItemForm } from "@/components/vault/password-item-form";
import {
  ApiKeyItemForm,
  CardItemForm,
  IdentityItemForm,
  NoteItemForm,
  SshKeyItemForm,
  TotpItemForm,
} from "@/components/vault/typed-item-forms";
import { getDecryptedItem, listDecryptedPasswordHistory } from "@/services/vault-items";
import { useVaultLock } from "@/store/vault-lock";
import type {
  ApiKeyPayload,
  CardPayload,
  IdentityPayload,
  NotePayload,
  PasswordPayload,
  SshKeyPayload,
  TotpPayload,
  VaultItemDecrypted,
  VaultItemPayload,
} from "@/types/vault";

interface HistoryEntry {
  id: string;
  archived_at: string;
  payload: VaultItemPayload;
}

function EditForm({ item }: { item: VaultItemDecrypted }) {
  switch (item.item_type) {
    case "password":
      return (
        <PasswordItemForm
          mode="edit"
          existing={item as VaultItemDecrypted<PasswordPayload>}
        />
      );
    case "note":
      return <NoteItemForm mode="edit" existing={item as VaultItemDecrypted<NotePayload>} />;
    case "api_key":
      return (
        <ApiKeyItemForm mode="edit" existing={item as VaultItemDecrypted<ApiKeyPayload>} />
      );
    case "ssh_key":
      return (
        <SshKeyItemForm mode="edit" existing={item as VaultItemDecrypted<SshKeyPayload>} />
      );
    case "card":
      return <CardItemForm mode="edit" existing={item as VaultItemDecrypted<CardPayload>} />;
    case "identity":
      return (
        <IdentityItemForm mode="edit" existing={item as VaultItemDecrypted<IdentityPayload>} />
      );
    case "totp":
      return <TotpItemForm mode="edit" existing={item as VaultItemDecrypted<TotpPayload>} />;
  }
}

export default function EditVaultItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isUnlocked = useVaultLock((s) => s.status.state === "unlocked");
  const [item, setItem] = useState<VaultItemDecrypted | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUnlocked) return;
    let cancelled = false;
    (async () => {
      try {
        const it = await getDecryptedItem(id);
        if (cancelled) return;
        if (!it) {
          setError("Item no encontrado");
          return;
        }
        setItem(it);
        const hist = await listDecryptedPasswordHistory(id);
        if (!cancelled) setHistory(hist);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "Error"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isUnlocked]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-4">
      <VaultGate>
        <Card>
          <CardHeader>
            <CardTitle>Editar item</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {!item && !error ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
            {item ? <EditForm item={item} /> : null}
            <p className="mt-4 text-center text-xs">
              <Link href="/" className="text-zinc-500 underline underline-offset-4">
                Volver
              </Link>
            </p>
          </CardContent>
        </Card>

        {history && history.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Historial de cambios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.map((h) => {
                const p = h.payload as { password?: string; name?: string };
                return (
                  <div key={h.id} className="rounded border border-zinc-200 p-2 text-xs dark:border-zinc-800">
                    <div className="text-zinc-500">
                      {new Date(h.archived_at).toLocaleString()}
                    </div>
                    {p.name ? <div>Nombre: {p.name}</div> : null}
                    {p.password ? (
                      <div className="font-mono">Password: {p.password}</div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}
      </VaultGate>
    </div>
  );
}
