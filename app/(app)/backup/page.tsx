"use client";

import { toast } from "sonner";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Lock,
  Upload,
} from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/vault/page-header";
import { VaultGate } from "@/components/vault/vault-gate";
import {
  downloadBackup,
  exportBackup,
  importBackup,
  previewBackup,
  type BackupPlaintext,
  type ImportSummary,
} from "@/services/backup";

const ITEM_TYPE_LABEL: Record<string, string> = {
  password: "Password",
  note: "Nota",
  api_key: "API Key",
  ssh_key: "SSH",
  card: "Tarjeta",
  identity: "Identidad",
  totp: "TOTP",
};

// Campos sensibles por tipo que la vista previa muestra ocultos con reveal.
function secretOfPayload(p: Record<string, unknown>): string | null {
  for (const k of ["password", "secret", "key", "private_key", "number"]) {
    const v = p[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function BackupInner() {
  const [exportPwd, setExportPwd] = useState("");
  const [importPwd, setImportPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [exportOk, setExportOk] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [preview, setPreview] = useState<BackupPlaintext | null>(null);
  const [revealedIdx, setRevealedIdx] = useState<number | null>(null);

  async function handleExport() {
    setExportOk(false);
    setExportError(null);
    if (exportPwd.length < 12) {
      setExportError("Password de backup min 12 caracteres");
      return;
    }
    setExportBusy(true);
    try {
      const backup = await exportBackup(exportPwd);
      downloadBackup(backup);
      setExportOk(true);
      toast.success("Backup cifrado y descargado");
      setExportPwd("");
    } catch (err) {
      setExportError(errorMessage(err, "Error exportando"));
    } finally {
      setExportBusy(false);
    }
  }

  async function handlePreview() {
    setImportSummary(null);
    setImportError(null);
    setPreview(null);
    setRevealedIdx(null);
    if (!file) {
      setImportError("Selecciona un archivo .json");
      return;
    }
    if (importPwd.length === 0) {
      setImportError("Ingresa la password del backup");
      return;
    }
    setPreviewBusy(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setPreview(await previewBackup(json, importPwd));
    } catch (err) {
      setImportError(errorMessage(err, "Error descifrando"));
    } finally {
      setPreviewBusy(false);
    }
  }

  async function handleImport() {
    setImportSummary(null);
    setImportError(null);
    setPreview(null);
    if (!file) {
      setImportError("Selecciona un archivo .json");
      return;
    }
    if (importPwd.length === 0) {
      setImportError("Ingresa la password del backup");
      return;
    }
    setImportBusy(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const summary = await importBackup(json, importPwd);
      setImportSummary(summary);
      toast.success(`Importados ${summary.itemsImported} items`);
      setImportPwd("");
      setFile(null);
    } catch (err) {
      setImportError(errorMessage(err, "Error importando"));
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <PageHeader
        title="Backup"
        description="Exporta e importa tu vault en JSON cifrado con PBKDF2 + AES-256-GCM."
      />

      {/* Export */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/25">
            <Download className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Exportar backup</h3>
            <p className="text-xs text-zinc-500">
              El archivo queda cifrado con la password que elijas. Sin esa password, es basura.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exportPwd">Password del backup (min 12)</Label>
          <InputWithIcon
            id="exportPwd"
            type={showPwd ? "text" : "password"}
            leftIcon={<Lock className="size-4" />}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label={showPwd ? "Ocultar" : "Mostrar"}
              >
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
            value={exportPwd}
            onChange={(e) => setExportPwd(e.target.value)}
          />
        </div>

        {exportError ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        ) : null}
        {exportOk ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>Backup generado. La descarga deberia haber iniciado.</span>
          </div>
        ) : null}

        <Button
          onClick={handleExport}
          disabled={exportBusy || exportPwd.length === 0}
          className="w-full gap-2"
          size="lg"
        >
          <Download className="size-4" />
          {exportBusy ? "Cifrando…" : "Exportar y descargar"}
        </Button>
      </Card>

      {/* Import */}
      <Card className="mt-5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
            <Upload className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Importar backup</h3>
            <p className="text-xs text-zinc-500">
              Los items se agregan sobre lo que ya tienes. Categorias/tags existentes se reutilizan
              por nombre.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="backupFile">Archivo .json</Label>
          <input
            id="backupFile"
            type="file"
            accept="application/json,.json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-white file:text-xs file:font-medium hover:file:bg-zinc-700 dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900"
          />
          {file ? (
            <p className="text-xs text-zinc-500">
              {file.name} — {(file.size / 1024).toFixed(1)} KB
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="importPwd">Password del backup</Label>
          <InputWithIcon
            id="importPwd"
            type={showPwd ? "text" : "password"}
            leftIcon={<Lock className="size-4" />}
            value={importPwd}
            onChange={(e) => setImportPwd(e.target.value)}
          />
        </div>

        {importError ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{importError}</span>
          </div>
        ) : null}
        {importSummary ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>
              Importados: {importSummary.itemsImported} items,{" "}
              {importSummary.categoriesCreated} categorias,{" "}
              {importSummary.tagsCreated} tags.
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={handlePreview}
            disabled={previewBusy || importBusy || !file || importPwd.length === 0}
            className="flex-1 gap-2"
            size="lg"
            variant="secondary"
          >
            <Eye className="size-4" />
            {previewBusy ? "Descifrando…" : "Vista previa"}
          </Button>
          <Button
            onClick={handleImport}
            disabled={importBusy || previewBusy || !file || importPwd.length === 0}
            className="flex-1 gap-2"
            size="lg"
            variant="outline"
          >
            <Upload className="size-4" />
            {importBusy ? "Descifrando…" : "Importar"}
          </Button>
        </div>

        {preview ? (
          <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Contenido del backup</h4>
                <p className="text-xs text-zinc-500">
                  Exportado {new Date(preview.exported_at).toLocaleString()} ·{" "}
                  {preview.items.length} items · {preview.categories.length} categorias ·{" "}
                  {preview.tags.length} tags. Solo lectura — nada se importo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setRevealedIdx(null);
                }}
                className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label="Cerrar vista previa"
              >
                <EyeOff className="size-4" />
              </button>
            </div>
            <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {preview.items.map((it, idx) => {
                const p = it.payload as unknown as Record<string, unknown>;
                const name = typeof p.name === "string" ? p.name : "(sin nombre)";
                const username = typeof p.username === "string" ? p.username : null;
                const secret = secretOfPayload(p);
                const revealed = revealedIdx === idx;
                return (
                  <li
                    key={idx}
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {ITEM_TYPE_LABEL[it.item_type] ?? it.item_type}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                      {secret ? (
                        <button
                          type="button"
                          onClick={() => setRevealedIdx(revealed ? null : idx)}
                          className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                          aria-label={revealed ? "Ocultar secreto" : "Ver secreto"}
                        >
                          {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      ) : null}
                    </div>
                    {username ? (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{username}</p>
                    ) : null}
                    {secret ? (
                      <p className="mt-1 font-mono text-xs break-all text-zinc-700 dark:text-zinc-300">
                        {revealed ? secret : "••••••••••••"}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export default function BackupPage() {
  return (
    <VaultGate>
      <BackupInner />
    </VaultGate>
  );
}
