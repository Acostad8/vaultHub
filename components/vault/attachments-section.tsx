"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileLock2, Paperclip, Trash2, Upload } from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  downloadAndDecryptAttachment,
  listDecryptedAttachments,
  MAX_ATTACHMENT_BYTES,
  removeAttachment,
  uploadAttachment,
  type AttachmentDecrypted,
} from "@/services/attachments";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsSection({ itemId }: { itemId: string }) {
  const [items, setItems] = useState<AttachmentDecrypted[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    listDecryptedAttachments(itemId)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Error cargando adjuntos"));
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  async function handleUpload(file: File) {
    setError(null);
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("Maximo 20 MB por archivo.");
      return;
    }
    setBusy(true);
    try {
      const created = await uploadAttachment(itemId, file);
      setItems((cur) => [...(cur ?? []), created]);
    } catch (err) {
      setError(errorMessage(err, "Error subiendo"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDownload(att: AttachmentDecrypted) {
    setError(null);
    try {
      await downloadAndDecryptAttachment(att);
    } catch (err) {
      setError(errorMessage(err, "Error descargando"));
    }
  }

  async function handleDelete(att: AttachmentDecrypted) {
    if (!confirm(`Borrar "${att.filename}"? No se puede deshacer.`)) return;
    setError(null);
    try {
      await removeAttachment(att);
      setItems((cur) => (cur ?? []).filter((a) => a.row.id !== att.row.id));
    } catch (err) {
      setError(errorMessage(err, "Error borrando"));
    }
  }

  return (
    <Card className="mt-4 p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <Paperclip className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Adjuntos cifrados</h3>
            <p className="text-xs text-zinc-500">
              Se cifran localmente con tu master key antes de subirse. Max 20 MB.
            </p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {busy ? "Cifrando…" : "Subir"}
        </Button>
      </div>

      {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
      {!items && !error ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
      {items && items.length === 0 ? (
        <p className="text-sm text-zinc-500">Sin adjuntos.</p>
      ) : null}

      <ul className="space-y-1.5">
        {items?.map((att) => (
          <li
            key={att.row.id}
            className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
          >
            <FileLock2 className="size-4 shrink-0 text-zinc-400" />
            <span className="min-w-0 flex-1 truncate text-sm">{att.filename}</span>
            <span className="shrink-0 text-xs text-zinc-500">{formatBytes(att.size_bytes)}</span>
            <button
              type="button"
              onClick={() => handleDownload(att)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Descargar y descifrar"
            >
              <Download className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(att)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              title="Borrar adjunto"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
