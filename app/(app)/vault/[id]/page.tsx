"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VaultGate } from "@/components/vault/vault-gate";
import { PasswordItemForm } from "@/components/vault/password-item-form";
import { getDecryptedItem } from "@/services/vault-items";
import { useVaultLock } from "@/store/vault-lock";
import type { PasswordPayload, VaultItemDecrypted } from "@/types/vault";

export default function EditVaultItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isUnlocked = useVaultLock((s) => s.status.state === "unlocked");
  const [item, setItem] = useState<VaultItemDecrypted<PasswordPayload> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUnlocked) return;
    getDecryptedItem(id)
      .then((it) => {
        if (!it) setError("Item no encontrado");
        else setItem(it as VaultItemDecrypted<PasswordPayload>);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error"));
  }, [id, isUnlocked]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <VaultGate>
        <Card>
          <CardHeader>
            <CardTitle>Editar item</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {!item && !error ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
            {item ? <PasswordItemForm mode="edit" existing={item} /> : null}
            <p className="mt-4 text-center text-xs">
              <Link href="/" className="text-zinc-500 underline underline-offset-4">
                Volver
              </Link>
            </p>
          </CardContent>
        </Card>
      </VaultGate>
    </div>
  );
}
