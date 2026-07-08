"use client";

import { useEffect, useState, use } from "react";
import { History } from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/card";
import { VaultGate } from "@/components/vault/vault-gate";
import { PageHeader } from "@/components/vault/page-header";
import { TotpViewer } from "@/components/vault/totp-viewer";
import { AttachmentsSection } from "@/components/vault/attachments-section";
import { ShareSection } from "@/components/vault/share-section";
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
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <VaultGate>
        <PageHeader title="Editar item" description="Los cambios se cifran antes de guardarse." />

        {item && item.item_type === "totp" ? (
          <div className="mb-4">
            <TotpViewer
              secret={(item.payload as { secret: string }).secret}
              issuer={(item.payload as { issuer?: string }).issuer}
              name={(item.payload as { name: string }).name}
            />
          </div>
        ) : null}

        <Card className="p-5">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!item && !error ? (
            <p className="text-sm text-zinc-500">Cargando…</p>
          ) : null}
          {item ? <EditForm item={item} /> : null}
        </Card>

        {item ? <AttachmentsSection itemId={item.id} /> : null}
        {item ? <ShareSection itemId={item.id} /> : null}

        {history && history.length > 0 ? (
          <Card className="mt-4 p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                <History className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Historial de cambios</h3>
                <p className="text-xs text-zinc-500">
                  {history.length} version{history.length === 1 ? "" : "es"} anterior
                  {history.length === 1 ? "" : "es"}.
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {history.map((h) => {
                const p = h.payload as { password?: string; name?: string };
                return (
                  <li
                    key={h.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/50"
                  >
                    <div className="mb-1 text-zinc-500">
                      {new Date(h.archived_at).toLocaleString()}
                    </div>
                    {p.name ? <div>Nombre: {p.name}</div> : null}
                    {p.password ? (
                      <div className="font-mono text-zinc-600 dark:text-zinc-400">
                        Password: {p.password}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}
      </VaultGate>
    </div>
  );
}
