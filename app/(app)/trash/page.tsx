"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VaultGate } from "@/components/vault/vault-gate";
import { PageHeader } from "@/components/vault/page-header";
import { listDecryptedTrash, purgeItem, restoreItem } from "@/services/vault-items";
import type { VaultItemDecrypted } from "@/types/vault";

function TrashInner() {
  const confirm = useConfirm();
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
    try {
      await restoreItem(id);
      setItems((prev) => prev?.filter((it) => it.id !== id) ?? prev);
      toast.success("Item restaurado");
    } catch (err) {
      toast.error(errorMessage(err, "Error restaurando"));
    }
  }

  async function handlePurge(id: string) {
    const ok = await confirm({
      title: "Eliminar permanentemente?",
      description: "Esta accion NO se puede deshacer. El item y su historial se borran.",
      confirmLabel: "Purgar",
      destructive: true,
    });
    if (!ok) return;
    try {
      await purgeItem(id);
      setItems((prev) => prev?.filter((it) => it.id !== id) ?? prev);
      toast.success("Item purgado");
    } catch (err) {
      toast.error(errorMessage(err, "Error purgando"));
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        title="Papelera"
        description="Items eliminados. Restaura o purga permanentemente."
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!items ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
      {items && items.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
            <Trash2 className="size-5" />
          </div>
          <p className="mt-4 text-sm font-medium">Papelera vacia</p>
          <p className="mt-1 text-xs text-zinc-500">
            Los items borrados aparecen aqui hasta que los restaures o purgues.
          </p>
        </Card>
      ) : null}

      <ul className="space-y-2">
        {items?.map((item) => {
          const p = item.payload as { name?: string };
          return (
            <li key={item.id}>
              <Card className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {p.name ?? "(sin nombre)"}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {item.item_type} · borrado{" "}
                      {item.deleted_at ? new Date(item.deleted_at).toLocaleString() : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(item.id)}
                      className="gap-1.5"
                    >
                      <RotateCcw className="size-3.5" />
                      Restaurar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handlePurge(item.id)}
                      className="gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      Purgar
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
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
