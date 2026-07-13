"use client";

// Wizard de 3 pasos para importar desde otros gestores.
//  1. Seleccionar fuente.
//  2. Subir archivo → preview client-side (nada persiste todavía).
//  3. Confirmar → cifrar + insertar cada item vía createItem().

import { useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Import, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  IMPORT_SOURCES,
  commitImport,
  parseImportFile,
  type ImportSource,
  type ImportedItem,
} from "@/services/import";

interface PreviewState {
  items: ImportedItem[];
  skipped: number;
  reasons: string[];
}

export function ImportWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [source, setSource] = useState<ImportSource | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<{
    itemsImported: number;
    categoriesCreated: number;
  } | null>(null);

  const sourceMeta = source ? IMPORT_SOURCES.find((s) => s.id === source) : null;

  function reset() {
    setStep(1);
    setSource(null);
    setFile(null);
    setPreview(null);
    setError(null);
    setImported(null);
  }

  async function handleParse() {
    if (!source || !file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await parseImportFile(source, file);
      setPreview(result);
      setStep(3);
    } catch (err) {
      setError(errorMessage(err, "No pude parsear el archivo"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const result = await commitImport(preview.items);
      setImported(result);
      toast.success(`Importados ${result.itemsImported} items`);
    } catch (err) {
      setError(errorMessage(err, "Error importando"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-5 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
          <Import className="size-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Importar desde otro gestor</h3>
          <p className="text-xs text-zinc-500">
            Bitwarden, 1Password, LastPass o export de tu navegador. Todo se cifra localmente
            antes de guardarse.
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          Paso {step} de 3
        </span>
      </div>

      {imported ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <div>
              Importados <strong>{imported.itemsImported}</strong> items y{" "}
              <strong>{imported.categoriesCreated}</strong> categorias.
            </div>
          </div>
          <Button variant="outline" onClick={reset}>
            Importar otro
          </Button>
        </div>
      ) : (
        <>
          {step === 1 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">1. De donde importas?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {IMPORT_SOURCES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSource(s.id);
                      setStep(2);
                      setFile(null);
                      setPreview(null);
                    }}
                    className="flex flex-col items-start gap-1 rounded-md border border-zinc-200 p-3 text-left text-sm hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/40"
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-zinc-500">{s.description}</span>
                    <span className="mt-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {s.format}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 2 && sourceMeta ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={reset}>
                  <ArrowLeft className="size-3.5" />
                </Button>
                <p className="text-sm font-medium">2. Sube el archivo de {sourceMeta.label}</p>
              </div>
              <p className="text-xs text-zinc-500">{sourceMeta.description}</p>

              <div className="space-y-1.5">
                <Label htmlFor="importFile">Archivo</Label>
                <input
                  id="importFile"
                  type="file"
                  accept={sourceMeta.accept}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-zinc-700 dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900"
                />
                {file ? (
                  <p className="text-xs text-zinc-500">
                    {file.name} — {(file.size / 1024).toFixed(1)} KB
                  </p>
                ) : null}
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button
                onClick={handleParse}
                disabled={busy || !file}
                className="gap-2"
              >
                <UploadCloud className="size-4" />
                {busy ? "Parseando…" : "Parsear y ver preview"}
              </Button>
            </div>
          ) : null}

          {step === 3 && preview ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="size-3.5" />
                </Button>
                <p className="text-sm font-medium">3. Preview — {preview.items.length} items</p>
              </div>

              {preview.reasons.length > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="mb-1 font-medium">Avisos ({preview.skipped} skip):</p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {preview.reasons.slice(0, 5).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                    {preview.reasons.length > 5 ? (
                      <li>… y {preview.reasons.length - 5} más</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2 text-xs dark:border-zinc-800">
                {preview.items.slice(0, 200).map((it, i) => {
                  const p = it.payload as { name?: string; username?: string; url?: string };
                  return (
                    <li key={i} className="flex items-center gap-2 border-b border-zinc-100 py-1 last:border-b-0 dark:border-zinc-800">
                      <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px] uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {it.item_type}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{p.name ?? "(sin nombre)"}</span>
                      {p.username ? <span className="text-zinc-500 truncate">{p.username}</span> : null}
                      {it.category_name ? (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                          {it.category_name}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
                {preview.items.length > 200 ? (
                  <li className="py-1 text-zinc-500">
                    … y {preview.items.length - 200} más (se importarán todos)
                  </li>
                ) : null}
              </ul>

              {error ? (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button onClick={handleCommit} disabled={busy || preview.items.length === 0} className="gap-2">
                <Import className="size-4" />
                {busy
                  ? "Cifrando e insertando…"
                  : `Importar ${preview.items.length} items`}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
