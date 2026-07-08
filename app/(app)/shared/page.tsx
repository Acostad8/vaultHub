"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Inbox, Share2, X } from "lucide-react";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/vault/page-header";
import { VaultGate } from "@/components/vault/vault-gate";
import {
  dismissReceivedShare,
  listReceivedSharesDecrypted,
  type ReceivedShareDecrypted,
} from "@/services/sharing";

const TYPE_LABEL: Record<string, string> = {
  password: "Password",
  note: "Nota",
  api_key: "API Key",
  ssh_key: "SSH",
  card: "Tarjeta",
  identity: "Identidad",
  totp: "TOTP",
};

const SECRET_KEYS = ["password", "secret", "key", "private_key", "number", "cvv"] as const;

function SharedInner() {
  const confirm = useConfirm();
  const [shares, setShares] = useState<ReceivedShareDecrypted[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  async function reload() {
    setError(null);
    try {
      setShares(await listReceivedSharesDecrypted());
    } catch (err) {
      setError(errorMessage(err, "Error cargando compartidos"));
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleDismiss(share: ReceivedShareDecrypted) {
    const ok = await confirm({
      title: "Quitar de tu vista?",
      description: "El owner tendria que volver a compartirlo si lo necesitas de nuevo.",
      confirmLabel: "Quitar",
    });
    if (!ok) return;
    try {
      await dismissReceivedShare(share.id);
      setShares((cur) => (cur ?? []).filter((s) => s.id !== share.id));
      toast.success("Item quitado de tu vista");
    } catch (err) {
      setError(errorMessage(err, "Error"));
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        title="Compartidos conmigo"
        description="Items que otros usuarios te compartieron. Descifrados solo en tu navegador."
      />

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {!shares && !error ? <p className="text-sm text-zinc-500">Descifrando…</p> : null}
      {shares && shares.length === 0 ? (
        <Card className="border-dashed">
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
              <Inbox className="size-6" />
            </div>
            <p className="text-sm text-zinc-500">Nadie te ha compartido items todavia.</p>
          </div>
        </Card>
      ) : null}

      <ul className="space-y-2">
        {shares?.map((share) => {
          const p = share.payload as unknown as Record<string, unknown>;
          const name = typeof p.name === "string" ? p.name : "(sin nombre)";
          const revealed = revealedId === share.id;
          const fields = Object.entries(p).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === "string" && entry[1].length > 0,
          );
          return (
            <li key={share.id}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Share2 className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{name}</span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {TYPE_LABEL[share.item_type] ?? share.item_type}
                      </span>
                    </div>
                    <p className="truncate text-xs text-zinc-500">
                      de {share.owner_email}
                      {share.expires_at
                        ? ` · expira ${new Date(share.expires_at).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRevealedId(revealed ? null : share.id)}
                    className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label={revealed ? "Ocultar detalles" : "Ver detalles"}
                    title={revealed ? "Ocultar detalles" : "Ver detalles"}
                  >
                    {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismiss(share)}
                    className="rounded-md p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label="Quitar de mi vista"
                    title="Quitar de mi vista"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {revealed ? (
                  <dl className="mt-3 space-y-1.5 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    {fields
                      .filter(([k]) => k !== "name")
                      .map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-sm">
                          <dt className="w-28 shrink-0 text-xs uppercase tracking-wide text-zinc-500">
                            {k.replace(/_/g, " ")}
                          </dt>
                          <dd
                            className={`min-w-0 flex-1 break-all ${
                              (SECRET_KEYS as readonly string[]).includes(k) ? "font-mono" : ""
                            }`}
                          >
                            {v}
                          </dd>
                        </div>
                      ))}
                  </dl>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SharedPage() {
  return (
    <VaultGate>
      <SharedInner />
    </VaultGate>
  );
}
