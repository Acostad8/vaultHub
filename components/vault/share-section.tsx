"use client";

import { useEffect, useState } from "react";
import { Send, Share2, Trash2 } from "lucide-react";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listGivenShares,
  revokeShare,
  shareItem,
  type GivenShareRow,
} from "@/services/sharing";

export function ShareSection({ itemId }: { itemId: string }) {
  const confirm = useConfirm();
  const [shares, setShares] = useState<GivenShareRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [expiresDays, setExpiresDays] = useState<string>("7");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // setState solo dentro de callbacks del Promise (no sincrono en el effect):
  // requisito de react-hooks/set-state-in-effect.
  function reload() {
    return listGivenShares(itemId).then(
      (list) => setShares(list),
      (err: unknown) => setError(errorMessage(err, "Error cargando shares")),
    );
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (!email.trim()) return;
    setBusy(true);
    try {
      const days = expiresDays === "" ? null : Number(expiresDays);
      await shareItem({ itemId, recipientEmail: email.trim(), expiresInDays: days });
      setOk(`Compartido con ${email.trim()}.`);
      toast.success(`Compartido con ${email.trim()}`);
      setEmail("");
      void reload();
    } catch (err) {
      setError(errorMessage(err, "Error compartiendo"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(share: GivenShareRow) {
    const ok = await confirm({
      title: `Revocar acceso de ${share.recipient_email}?`,
      description: "Dejara de ver este item inmediatamente.",
      confirmLabel: "Revocar",
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    try {
      await revokeShare(share.id);
      toast.success("Acceso revocado");
      void reload();
    } catch (err) {
      setError(errorMessage(err, "Error revocando"));
    }
  }

  return (
    <Card className="mt-4 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          <Share2 className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Compartir</h3>
          <p className="text-xs text-zinc-500">
            Snapshot cifrado extremo a extremo — solo el destinatario puede leerlo. Cambios
            posteriores no se propagan.
          </p>
        </div>
      </div>

      <form onSubmit={handleShare} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <Label htmlFor="share-email" className="text-xs">
            Email del destinatario
          </Label>
          <Input
            id="share-email"
            type="email"
            placeholder="otro@usuario.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="w-full space-y-1 sm:w-32">
          <Label htmlFor="share-expiry" className="text-xs">
            Expira en
          </Label>
          <select
            id="share-expiry"
            value={expiresDays}
            onChange={(e) => setExpiresDays(e.target.value)}
            className="w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-800"
          >
            <option value="1">1 dia</option>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="">Nunca</option>
          </select>
        </div>
        <Button type="submit" disabled={busy || !email.trim()} className="gap-1.5">
          <Send className="size-4" />
          {busy ? "Cifrando…" : "Compartir"}
        </Button>
      </form>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {ok ? <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{ok}</p> : null}

      {shares && shares.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {shares.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <span className="min-w-0 flex-1 truncate">{s.recipient_email}</span>
              <span className="shrink-0 text-xs text-zinc-500">
                {s.expires_at
                  ? `expira ${new Date(s.expires_at).toLocaleDateString()}`
                  : "sin expiracion"}
              </span>
              <button
                type="button"
                onClick={() => handleRevoke(s)}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                title="Revocar acceso"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
