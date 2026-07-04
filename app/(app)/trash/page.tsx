"use client";

import { errorMessage } from "@/lib/errors";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VaultGate } from "@/components/vault/vault-gate";
import { listDecryptedTrash, purgeItem, restoreItem } from "@/services/vault-items";
import type { VaultItemDecrypted } from "@/types/vault";

function TrashInner() {
  const [items, setItems] = useState<VaultItemDecrypted[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDecryptedTrash()
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

  async function handleRestore(id: string) {
    await restoreItem(id);
    setItems((prev) => prev?.filter((it) => it.id !== id) ?? prev);
  }

  async function handlePurge(id: string) {
    if (!confirm("Eliminar permanentemente? Esta accion NO se puede deshacer.")) return;
    await purgeItem(id);
    setItems((prev) => prev?.filter((it) => it.id !== id) ?? prev);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Papelera</h1>
        <Link href="/" className="text-sm text-zinc-500 underline underline-offset-4">
          Volver
        </Link>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!items ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
      {items && items.length === 0 ? (
        <p className="text-sm text-zinc-500">Papelera vacia.</p>
      ) : null}

      {items?.map((item) => {
        const p = item.payload as { name?: string };
        return (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{p.name ?? "(sin nombre)"}</CardTitle>
                <p className="text-xs text-zinc-500">
                  {item.item_type} · borrado{" "}
                  {item.deleted_at ? new Date(item.deleted_at).toLocaleString() : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="xs" variant="outline" onClick={() => handleRestore(item.id)}>
                  Restaurar
                </Button>
                <Button size="xs" variant="destructive" onClick={() => handlePurge(item.id)}>
                  Purgar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-2 text-xs text-zinc-500">
              El historial de cambios de este item se elimina en cascada al purgar.
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function TrashPage() {
  return (
    <VaultGate>
      <TrashInner />
    </VaultGate>
  );
}
