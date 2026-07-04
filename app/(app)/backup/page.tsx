"use client";

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
import { downloadBackup, exportBackup, importBackup, type ImportSummary } from "@/services/backup";

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
      setExportPwd("");
    } catch (err) {
      setExportError(errorMessage(err, "Error exportando"));
    } finally {
      setExportBusy(false);
    }
  }

  async function handleImport() {
    setImportSummary(null);
    setImportError(null);
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

        <Button
          onClick={handleImport}
          disabled={importBusy || !file || importPwd.length === 0}
          className="w-full gap-2"
          size="lg"
          variant="outline"
        >
          <Upload className="size-4" />
          {importBusy ? "Descifrando…" : "Importar"}
        </Button>
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
