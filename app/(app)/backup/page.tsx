"use client";

import { toast } from "sonner";
import { useState } from "react";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileJson,
  Lock,
  Upload,
} from "lucide-react";

import { errorMessage } from "@/lib/errors";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { VaultGate } from "@/components/vault/vault-gate";
import { AutoBackupToggle } from "@/components/vault/auto-backup-toggle";
import { ImportWizard } from "@/components/vault/import-wizard";
import {
  EmptyState,
  ErrorBanner,
  ModuleCard,
  ModuleHero,
  ModuleSectionHeader,
  ModuleShell,
} from "@/components/vault/module-shell";
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

// Campos considerados secretos en el preview del backup — se muestran
// ocultos hasta que el usuario los revela explicitamente.
function secretOfPayload(p: Record<string, unknown>): string | null {
  for (const k of ["password", "secret", "key", "private_key", "number"]) {
    const v = p[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

// Fuerza visual de la password del backup. No es un estimador de entropia
// real (para eso ver /generator) — solo un indicador ordinal para que el
// usuario perciba si esta debil, media o fuerte.
function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; tone: string } {
  if (pw.length === 0) return { level: 0, label: "vacio", tone: "bg-zinc-400" };
  if (pw.length < 12) return { level: 0, label: "corta", tone: "bg-red-500" };
  const classes =
    Number(/[a-z]/.test(pw)) +
    Number(/[A-Z]/.test(pw)) +
    Number(/\d/.test(pw)) +
    Number(/[^A-Za-z0-9]/.test(pw));
  if (pw.length >= 20 && classes >= 3) return { level: 3, label: "fuerte", tone: "bg-emerald-500" };
  if (pw.length >= 14 && classes >= 2) return { level: 2, label: "media", tone: "bg-amber-500" };
  return { level: 1, label: "aceptable", tone: "bg-yellow-500" };
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

  const strength = passwordStrength(exportPwd);

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
    <ModuleShell
      footerNote="backups cifrados end-to-end · sin la password son ruido"
      hero={
        <ModuleHero
          eyebrow="vault.backup"
          title="Backup & restore"
          description="Exporta tu vault en JSON cifrado con PBKDF2 600k + AES-256-GCM. Reimportalo en otro dispositivo o restauralo tras un incidente."
          badge={{ icon: Archive, label: "cifrado local" }}
        />
      }
    >
      {/* Auto-backup reminder — reusa el toggle existente */}
      <ModuleCard>
        <ModuleSectionHeader
          title="recordatorio automatico"
          hint="Zero-Knowledge no permite auto-backup real — VaultHub te lo recuerda en el intervalo que elijas."
        />
        <div className="p-4">
          <AutoBackupToggle />
        </div>
      </ModuleCard>

      {/* Export */}
      <ModuleCard>
        <ModuleSectionHeader
          title="exportar backup"
          hint="Descarga tu vault en un .json cifrado. Sin la password es imposible descifrarlo."
          right={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
              <Download className="size-3" />
              .json
            </span>
          }
        />
        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="exportPwd" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Password del backup <span className="text-zinc-500">(min 12 chars)</span>
            </Label>
            <InputWithIcon
              id="exportPwd"
              type={showPwd ? "text" : "password"}
              leftIcon={<Lock className="size-4" />}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="rounded p-1 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label={showPwd ? "Ocultar" : "Mostrar"}
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              value={exportPwd}
              onChange={(e) => setExportPwd(e.target.value)}
              placeholder="clave-unica-para-este-backup"
            />
            {/* Strength meter — 4 barras que se llenan segun nivel */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= strength.level ? strength.tone : "bg-zinc-200 dark:bg-zinc-800"
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                {strength.label}
              </span>
            </div>
          </div>

          <div className="rounded-md border border-amber-500/25 bg-amber-500/5 p-3 font-mono text-[11px] text-amber-800 dark:text-amber-200">
            <p>
              <span className="text-amber-600 dark:text-amber-400">! </span>
              guarda esta password fuera del vault. si la pierdes, el backup es irrecuperable — es la
              regla zero-knowledge.
            </p>
          </div>

          {exportError ? <ErrorBanner message={exportError} /> : null}
          {exportOk ? (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>Backup generado. La descarga deberia haber iniciado.</span>
            </div>
          ) : null}

          <button
            onClick={handleExport}
            disabled={exportBusy || exportPwd.length === 0}
            className="group inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-medium text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            <Download className="size-4" />
            {exportBusy ? "cifrando…" : "cifrar y descargar"}
            {!exportBusy ? (
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            ) : null}
          </button>
        </div>
      </ModuleCard>

      {/* Import from VaultHub backup */}
      <ModuleCard>
        <ModuleSectionHeader
          title="importar backup"
          hint="Restaurar desde un .json cifrado exportado antes. Los items se agregan sobre lo que ya tienes."
          right={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              <Upload className="size-3" />
              .json
            </span>
          }
        />
        <div className="space-y-4 p-5">
          {/* File dropzone-style */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Archivo del backup
            </Label>
            <label
              htmlFor="backupFile"
              className="group flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-3 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/5 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-emerald-500/50"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-200 text-zinc-600 transition-colors group-hover:bg-emerald-500/20 group-hover:text-emerald-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:text-emerald-300">
                <FileJson className="size-4" />
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
                      Selecciona un .json
                    </p>
                    <p className="text-[11px] text-zinc-500">click para elegir archivo</p>
                  </>
                )}
              </div>
              <input
                id="backupFile"
                type="file"
                accept="application/json,.json"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="importPwd" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Password del backup
            </Label>
            <InputWithIcon
              id="importPwd"
              type={showPwd ? "text" : "password"}
              leftIcon={<Lock className="size-4" />}
              value={importPwd}
              onChange={(e) => setImportPwd(e.target.value)}
              placeholder="la que usaste al exportar"
            />
          </div>

          {importError ? <ErrorBanner message={importError} /> : null}
          {importSummary ? (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>
                Importados: <strong>{importSummary.itemsImported}</strong> items,{" "}
                <strong>{importSummary.categoriesCreated}</strong> categorias,{" "}
                <strong>{importSummary.tagsCreated}</strong> tags.
              </span>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handlePreview}
              disabled={previewBusy || importBusy || !file || importPwd.length === 0}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white text-sm font-medium text-zinc-700 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
            >
              <Eye className="size-4" />
              {previewBusy ? "descifrando…" : "vista previa"}
            </button>
            <button
              onClick={handleImport}
              disabled={importBusy || previewBusy || !file || importPwd.length === 0}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-medium text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              <Upload className="size-4" />
              {importBusy ? "descifrando…" : "importar"}
            </button>
          </div>

          {preview ? (
            <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                    &gt; preview.contents
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Exportado {new Date(preview.exported_at).toLocaleString()} ·{" "}
                    {preview.items.length} items · {preview.categories.length} categorias ·{" "}
                    {preview.tags.length} tags
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Solo lectura. Nada se importó todavía.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setRevealedIdx(null);
                  }}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
                      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {ITEM_TYPE_LABEL[it.item_type] ?? it.item_type}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                        {secret ? (
                          <button
                            type="button"
                            onClick={() => setRevealedIdx(revealed ? null : idx)}
                            className="rounded p-1 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
                            aria-label={revealed ? "Ocultar secreto" : "Ver secreto"}
                          >
                            {revealed ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        ) : null}
                      </div>
                      {username ? (
                        <p className="mt-0.5 truncate text-xs text-zinc-500">{username}</p>
                      ) : null}
                      {secret ? (
                        <p className="mt-1 break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
                          {revealed ? secret : "••••••••••••"}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </ModuleCard>

      {/* Wizard para importar desde otros gestores */}
      <ImportWizard />
    </ModuleShell>
  );
}

// Estado vacio inicial — solo por defensa; el flujo del vault llega aca con
// sesion valida y VaultGate ya garantizo unlock. Se muestra si algo hace
// que <BackupInner /> no reciba las props esperadas.
export function BackupEmpty() {
  return (
    <ModuleShell
      hero={
        <ModuleHero
          eyebrow="vault.backup"
          title="Backup & restore"
          description="Sin datos aun."
        />
      }
    >
      <ModuleCard>
        <div className="p-6">
          <EmptyState
            icon={<Archive className="size-6" />}
            title="Sin actividad de backup"
            hint="Cuando exportes por primera vez apareceran aqui las opciones."
          />
        </div>
      </ModuleCard>
    </ModuleShell>
  );
}

export default function BackupPage() {
  return (
    <VaultGate>
      <BackupInner />
    </VaultGate>
  );
}
