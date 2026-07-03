"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listDecryptedItems, trashItem } from "@/services/vault-items";
import type { VaultItemDecrypted } from "@/types/vault";

export function VaultList() {
  const [items, setItems] = useState<VaultItemDecrypted[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setError(null);
    try {
      const decrypted = await listDecryptedItems();
      setItems(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const decrypted = await listDecryptedItems();
        if (!cancelled) setItems(decrypted);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    await trashItem(id);
    void reload();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!items) return <p className="text-sm text-zinc-500">Cargando items…</p>;

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-zinc-500">
            Vault vacio. Crea tu primer item.
          </CardContent>
        </Card>
      ) : null}
      {items.map((item) => {
        const p = item.payload as { name?: string; username?: string; url?: string };
        return (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{p.name ?? "(sin nombre)"}</CardTitle>
                <p className="text-xs text-zinc-500">
                  {item.item_type}
                  {p.username ? ` · ${p.username}` : ""}
                  {p.url ? ` · ${p.url}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/vault/${item.id}`}
                  className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  Editar
                </Link>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => handleDelete(item.id)}
                >
                  Papelera
                </Button>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
