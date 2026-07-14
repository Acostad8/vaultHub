"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, EyeOff, Filter, Inbox, Search, Share2, X } from "lucide-react";

import { InputWithIcon } from "@/components/ui/input-with-icon";

import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { useConfirm } from "@/components/providers/confirm-dialog";
import { VaultGate } from "@/components/vault/vault-gate";
import {
  EmptyState,
  ErrorBanner,
  LoadingHint,
  ModuleCard,
  ModuleHero,
  ModuleSectionHeader,
  ModuleShell,
} from "@/components/vault/module-shell";
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

const SECRET_KEYS = new Set(["password", "secret", "key", "private_key", "number", "cvv"]);

type TypeFilter = "all" | string;

function SharedInner() {
  const confirm = useConfirm();
  const [shares, setShares] = useState<ReceivedShareDecrypted[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  // Captura Date.now() al montar para no ejecutar impureza en render (react-hooks/purity).
  // El "expira pronto" no necesita reloj vivo: recalcularlo por navegacion basta.
  const [nowMs] = useState(() => Date.now());

  // Owners y tipos unicos presentes en la vista actual (para poblar los filtros).
  const owners = useMemo(() => {
    if (!shares) return [] as string[];
    return Array.from(new Set(shares.map((s) => s.owner_email))).sort();
  }, [shares]);
  const types = useMemo(() => {
    if (!shares) return [] as string[];
    return Array.from(new Set(shares.map((s) => s.item_type))).sort();
  }, [shares]);

  const filtered = useMemo(() => {
    if (!shares) return null;
    const q = query.trim().toLowerCase();
    return shares.filter((s) => {
      if (typeFilter !== "all" && s.item_type !== typeFilter) return false;
      if (ownerFilter !== "all" && s.owner_email !== ownerFilter) return false;
      if (!q) return true;
      const p = s.payload as unknown as Record<string, unknown>;
      const name = typeof p.name === "string" ? p.name : "";
      return (
        name.toLowerCase().includes(q) ||
        s.owner_email.toLowerCase().includes(q) ||
        (TYPE_LABEL[s.item_type] ?? s.item_type).toLowerCase().includes(q)
      );
    });
  }, [shares, query, typeFilter, ownerFilter]);

  const hasAnyFilter = query || typeFilter !== "all" || ownerFilter !== "all";

  function reload() {
    return listReceivedSharesDecrypted().then(
      (list) => {
        setShares(list);
        setError(null);
      },
      (err: unknown) => setError(errorMessage(err, "Error cargando compartidos")),
    );
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

  async function handleCopy(fieldKey: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(fieldKey);
    toast.success("Copiado");
    setTimeout(() => setCopiedKey((k) => (k === fieldKey ? null : k)), 1500);
  }

  return (
    <ModuleShell
      footerNote="descifrado en tu navegador con tu master key"
      hero={
        <ModuleHero
          eyebrow="vault.shared"
          title="Compartidos conmigo"
          description="Items que otros usuarios te compartieron. Solo tu navegador puede descifrarlos con tu master key."
          badge={{ icon: Share2, label: `${shares?.length ?? 0} recibidos` }}
        />
      }
    >
      <ModuleCard>
        <ModuleSectionHeader
          title="recibidos"
          hint="Click en el ojo para revelar los campos. Quitar solo oculta de tu vista, no borra el original."
          right={
            shares && shares.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {filtered?.length ?? 0} / {shares.length}
              </span>
            ) : null
          }
        />
        <div className="space-y-4 p-4">
          {/* Toolbar: search + filtros por tipo/owner */}
          {shares && shares.length > 1 ? (
            <div className="space-y-2">
              <InputWithIcon
                placeholder="Buscar por nombre, remitente o tipo…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                leftIcon={<Search className="size-4" />}
                rightSlot={
                  query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      aria-label="Limpiar busqueda"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : undefined
                }
              />
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-zinc-500">
                  <Filter className="size-3.5" />
                  filtros
                </span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 dark:border-zinc-800"
                >
                  <option value="all">Todos los tipos</option>
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t] ?? t}
                    </option>
                  ))}
                </select>
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 dark:border-zinc-800"
                >
                  <option value="all">Todos los remitentes</option>
                  {owners.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                {hasAnyFilter ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setTypeFilter("all");
                      setOwnerFilter("all");
                    }}
                    className="rounded-md border border-zinc-200 px-2 py-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Limpiar
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? <ErrorBanner message={error} /> : null}
          {!shares && !error ? <LoadingHint text="descifrando payloads" /> : null}
          {shares && shares.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-6" />}
              title="Sin items compartidos"
              hint="Cuando alguien te comparta un item aparecera aqui."
            />
          ) : null}
          {shares && shares.length > 0 && filtered && filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="size-6" />}
              title="Sin resultados"
              hint="Ajusta la busqueda o los filtros."
            />
          ) : null}

          {filtered && filtered.length > 0 ? (
            <ul className="space-y-2">
              {filtered.map((share) => {
                const p = share.payload as unknown as Record<string, unknown>;
                const name = typeof p.name === "string" ? p.name : "(sin nombre)";
                const revealed = revealedId === share.id;
                const fields = Object.entries(p).filter(
                  (entry): entry is [string, string] =>
                    typeof entry[1] === "string" && entry[1].length > 0,
                );
                const expiresSoon = share.expires_at
                  ? new Date(share.expires_at).getTime() - nowMs <
                    7 * 24 * 60 * 60 * 1000
                  : false;
                return (
                  <li key={share.id}>
                    <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white transition-colors hover:border-emerald-400/40 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-emerald-500/30">
                      <div className="flex items-start gap-3 p-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
                          <Share2 className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {name}
                            </span>
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {TYPE_LABEL[share.item_type] ?? share.item_type}
                            </span>
                            {share.expires_at ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  expiresSoon
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                }`}
                              >
                                expira {new Date(share.expires_at).toLocaleDateString()}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            compartido por{" "}
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {share.owner_email}
                            </span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setRevealedId(revealed ? null : share.id)}
                            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                            aria-label={revealed ? "Ocultar detalles" : "Ver detalles"}
                            title={revealed ? "Ocultar detalles" : "Ver detalles"}
                          >
                            {revealed ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismiss(share)}
                            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            aria-label="Quitar de mi vista"
                            title="Quitar de mi vista"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                      {revealed ? (
                        <dl className="grid gap-2 border-t border-zinc-200 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                          {fields
                            .filter(([k]) => k !== "name")
                            .map(([k, v]) => {
                              const isSecret = SECRET_KEYS.has(k);
                              const fieldKey = `${share.id}:${k}`;
                              const wasCopied = copiedKey === fieldKey;
                              return (
                                <div
                                  key={k}
                                  className="flex items-start gap-2 text-sm sm:grid sm:grid-cols-[8rem_1fr_auto] sm:items-center"
                                >
                                  <dt className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                                    {k.replace(/_/g, " ")}
                                  </dt>
                                  <dd
                                    className={`min-w-0 flex-1 break-all ${
                                      isSecret
                                        ? "font-mono text-emerald-700 dark:text-emerald-300"
                                        : "text-zinc-800 dark:text-zinc-100"
                                    }`}
                                  >
                                    {v}
                                  </dd>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(fieldKey, v)}
                                    className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                    aria-label={wasCopied ? "Copiado" : `Copiar ${k}`}
                                    title={wasCopied ? "Copiado" : `Copiar ${k}`}
                                  >
                                    {wasCopied ? (
                                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                        ✓
                                      </span>
                                    ) : (
                                      <Copy className="size-3.5" />
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                        </dl>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </ModuleCard>
    </ModuleShell>
  );
}

export default function SharedPage() {
  return (
    <VaultGate>
      <SharedInner />
    </VaultGate>
  );
}
