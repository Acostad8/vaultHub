"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileArchive,
  FileAudio,
  FileImage,
  FileLock2,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
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

function iconForMime(mime: string | null): React.ComponentType<{ className?: string }> {
  if (!mime) return FileLock2;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime === "application/pdf" || mime.startsWith("text/")) return FileText;
  if (
    mime.includes("spreadsheet") ||
    mime === "text/csv" ||
    mime.includes("excel")
  ) return FileSpreadsheet;
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("tar")) {
    return FileArchive;
  }
  return FileLock2;
}

export function AttachmentsSection({ itemId }: { itemId: string }) {
  const confirm = useConfirm();
  const [items, setItems] = useState<AttachmentDecrypted[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
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
      toast.success(`"${file.name}" cifrado y subido`);
    } catch (err) {
      setError(errorMessage(err, "Error subiendo"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    // Subida secuencial: la master key es sync pero encriptar N archivos en
    // paralelo mata la UX; además evita spikes de memoria con archivos grandes.
    for (const f of Array.from(files)) {
      await handleUpload(f);
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
    const ok = await confirm({
      title: `Borrar "${att.filename}"?`,
      description: "No se puede deshacer.",
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    try {
      await removeAttachment(att);
      setItems((cur) => (cur ?? []).filter((a) => a.row.id !== att.row.id));
      toast.success("Adjunto borrado");
    } catch (err) {
      setError(errorMessage(err, "Error borrando"));
    }
  }

  return (
    <Card className="mt-4 p-5">
      <div className="mb-4 flex items-center gap-2">
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
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          void handleFiles(e.dataTransfer.files);
        }}
        disabled={busy}
        aria-label="Zona de subida. Arrastra archivos o haz click para elegir"
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragActive
            ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <Upload className="size-6 text-zinc-400" />
        <div className="text-sm">
          <span className="font-medium">
            {busy ? "Cifrando y subiendo…" : "Arrastra un archivo aqui"}
          </span>
          <span className="text-zinc-500"> o haz click para elegir</span>
        </div>
        <p className="text-xs text-zinc-400">
          Se cifra en tu navegador con AES-256-GCM antes de subirse
        </p>
      </button>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {!items && !error ? <p className="mt-3 text-sm text-zinc-500">Cargando…</p> : null}
      {items && items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Sin adjuntos.</p>
      ) : null}

      <ul className="mt-3 space-y-1.5">
        {items?.map((att) => {
          const Icon = iconForMime(att.mime);
          return (
            <li
              key={att.row.id}
              className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <Icon className="size-4 shrink-0 text-zinc-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{att.filename}</div>
                {att.mime ? (
                  <div className="truncate text-[10px] text-zinc-400">{att.mime}</div>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-zinc-500">
                {formatBytes(att.size_bytes)}
              </span>
              <button
                type="button"
                onClick={() => handleDownload(att)}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="Descargar y descifrar"
                aria-label={`Descargar ${att.filename}`}
              >
                <Download className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(att)}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                title="Borrar adjunto"
                aria-label={`Borrar ${att.filename}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
