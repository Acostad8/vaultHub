"use client";

// Wizard de 3 pasos para importar desde otros gestores.
//  1. Seleccionar fuente.
//  2. Subir archivo → preview client-side (nada persiste todavía).
//  3. Confirmar → cifrar + insertar cada item vía createItem().

import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Import,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { Label } from "@/components/ui/label";
import { ModuleCard, ModuleSectionHeader } from "@/components/vault/module-shell";
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
    <ModuleCard>
      <ModuleSectionHeader
        title="importar desde otro gestor"
        hint="Bitwarden, 1Password, LastPass o export del navegador. Todo se cifra localmente antes de guardarse."
        right={
          <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            <StepDot active={step === 1} done={step > 1} label="1" />
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <StepDot active={step === 2} done={step > 2} label="2" />
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <StepDot active={step === 3} done={false} label="3" />
          </div>
        }
      />

      <div className="p-5">
        {imported ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">Importacion completa</p>
                <p className="mt-1">
                  <strong>{imported.itemsImported}</strong> items y{" "}
                  <strong>{imported.categoriesCreated}</strong> categorias agregadas al vault.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
            >
              <ArrowLeft className="size-4" />
              importar otro archivo
            </button>
          </div>
        ) : (
          <>
            {step === 1 ? (
              <div className="space-y-3">
                <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                  &gt; paso 1 — origen
                </p>
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
                      className="group flex flex-col items-start gap-1.5 rounded-lg border border-zinc-200 bg-white p-4 text-left text-sm shadow-sm transition-all hover:-translate-y-px hover:border-emerald-400/60 hover:bg-emerald-50/60 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-950/20"
                    >
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {s.label}
                      </span>
                      <span className="text-xs text-zinc-500">{s.description}</span>
                      <span className="mt-1 rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-700 group-hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {s.format}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 2 && sourceMeta ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Volver"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                    &gt; paso 2 — archivo de {sourceMeta.label}
                  </p>
                </div>
                <p className="text-xs text-zinc-500">{sourceMeta.description}</p>

                <div className="space-y-2">
                  <Label
                    htmlFor="importFile"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Archivo
                  </Label>
                  <label
                    htmlFor="importFile"
                    className="group flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-3 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/5 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-emerald-500/50"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-200 text-zinc-600 transition-colors group-hover:bg-emerald-500/20 group-hover:text-emerald-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:text-emerald-300">
                      <UploadCloud className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {file ? (
                        <>
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {file.name}
                          </p>
                          <p className="font-mono text-[11px] text-zinc-500">
                            {(file.size / 1024).toFixed(1)} kb
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Selecciona el archivo
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            formatos: {sourceMeta.accept}
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      id="importFile"
                      type="file"
                      accept={sourceMeta.accept}
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="sr-only"
                    />
                  </label>
                </div>

                {error ? (
                  <div className="flex items-start gap-2 rounded-md border border-red-500/25 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <button
                  onClick={handleParse}
                  disabled={busy || !file}
                  className="group inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-medium text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  <UploadCloud className="size-4" />
                  {busy ? "parseando…" : "parsear y ver preview"}
                  {!busy ? (
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  ) : null}
                </button>
              </div>
            ) : null}

            {step === 3 && preview ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Volver"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                    &gt; paso 3 — preview{" "}
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {preview.items.length} items
                    </span>
                  </p>
                </div>

                {preview.reasons.length > 0 ? (
                  <div className="rounded-md border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200">
                    <p className="mb-1 font-mono uppercase tracking-widest">
                      ! avisos ({preview.skipped} skip)
                    </p>
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

                <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50/60 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
                  {preview.items.slice(0, 200).map((it, i) => {
                    const p = it.payload as { name?: string; username?: string; url?: string };
                    return (
                      <li
                        key={i}
                        className="flex items-center gap-2 border-b border-zinc-100 py-1.5 last:border-b-0 dark:border-zinc-800/60"
                      >
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {it.item_type}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{p.name ?? "(sin nombre)"}</span>
                        {p.username ? (
                          <span className="truncate text-zinc-500">{p.username}</span>
                        ) : null}
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
                  <div className="flex items-start gap-2 rounded-md border border-red-500/25 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <button
                  onClick={handleCommit}
                  disabled={busy || preview.items.length === 0}
                  className="group inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-medium text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  <Import className="size-4" />
                  {busy ? "cifrando e insertando…" : `importar ${preview.items.length} items`}
                  {!busy ? (
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  ) : null}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </ModuleCard>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex size-5 items-center justify-center rounded-full font-mono text-[10px] ${
        done
          ? "bg-emerald-500 text-white"
          : active
            ? "border border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
      }`}
      aria-hidden
    >
      {done ? <Check className="size-3" /> : label}
    </span>
  );
}
