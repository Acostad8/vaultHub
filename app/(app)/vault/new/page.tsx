"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  FileText,
  IdCard,
  Key,
  KeyRound,
  Lock,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import { VaultGate } from "@/components/vault/vault-gate";
import { PasswordItemForm } from "@/components/vault/password-item-form";
import {
  ApiKeyItemForm,
  CardItemForm,
  IdentityItemForm,
  NoteItemForm,
  SshKeyItemForm,
  TotpItemForm,
} from "@/components/vault/typed-item-forms";
import type { VaultItemType } from "@/types/vault";

interface TypeMeta {
  value: VaultItemType;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

const TYPES: TypeMeta[] = [
  {
    value: "password",
    label: "Password",
    hint: "Login web · usuario + contraseña",
    icon: KeyRound,
    accent: "from-indigo-500 to-violet-600",
  },
  {
    value: "note",
    label: "Nota",
    hint: "Texto seguro cifrado",
    icon: FileText,
    accent: "from-amber-500 to-orange-600",
  },
  {
    value: "api_key",
    label: "API Key",
    hint: "Token / secret de servicio",
    icon: Key,
    accent: "from-emerald-500 to-green-600",
  },
  {
    value: "ssh_key",
    label: "SSH",
    hint: "Clave privada + passphrase",
    icon: Terminal,
    accent: "from-purple-500 to-fuchsia-600",
  },
  {
    value: "card",
    label: "Tarjeta",
    hint: "Numero + CVV + expiracion",
    icon: CreditCard,
    accent: "from-rose-500 to-pink-600",
  },
  {
    value: "identity",
    label: "Identidad",
    hint: "Documento personal",
    icon: IdCard,
    accent: "from-cyan-500 to-sky-600",
  },
  {
    value: "totp",
    label: "TOTP",
    hint: "Semilla 2FA / authenticator",
    icon: ShieldCheck,
    accent: "from-teal-500 to-emerald-600",
  },
];

function FormForType({ type }: { type: VaultItemType }) {
  switch (type) {
    case "password":
      return <PasswordItemForm mode="create" />;
    case "note":
      return <NoteItemForm mode="create" />;
    case "api_key":
      return <ApiKeyItemForm mode="create" />;
    case "ssh_key":
      return <SshKeyItemForm mode="create" />;
    case "card":
      return <CardItemForm mode="create" />;
    case "identity":
      return <IdentityItemForm mode="create" />;
    case "totp":
      return <TotpItemForm mode="create" />;
  }
}

function NewItemInner() {
  const [type, setType] = useState<VaultItemType>("password");
  const active = TYPES.find((t) => t.value === type)!;

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Blob decorativo emerald (misma firma visual que /vault) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.09),transparent_60%)]"
      />

      <div className="relative mx-auto w-full max-w-3xl px-4 py-10">
        {/* Custom hero: back link + eyebrow terminal + h1 + subtitulo + trust badge */}
        <div className="mb-8 space-y-3">
          <Link
            href="/vault"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <ArrowLeft className="size-3.5" />
            volver al vault
          </Link>
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80">
            &gt; vault.item.new
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              Crear item
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              <Lock className="size-3" />
              cifrado local
            </span>
          </div>
          <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            El payload se cifra en tu navegador con{" "}
            <span className="font-mono text-emerald-600 dark:text-emerald-400">AES-256-GCM</span>{" "}
            antes de enviarse. Metadata no sensible (tipo, categoria) viaja en claro.
          </p>
        </div>

        {/* Paso 1 — tipo */}
        <section
          aria-labelledby="step-type"
          className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50/60 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-semibold text-white">
              1
            </span>
            <div className="min-w-0">
              <h2
                id="step-type"
                className="font-mono text-xs uppercase tracking-widest text-zinc-700 dark:text-zinc-200"
              >
                &gt; select.type
              </h2>
              <p className="text-xs text-zinc-500">Elige el tipo de item que vas a guardar.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3 lg:grid-cols-4">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const selected = t.value === type;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  aria-pressed={selected}
                  className={`group relative flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all ${
                    selected
                      ? "border-emerald-500 bg-emerald-50 shadow-sm shadow-emerald-500/20 dark:border-emerald-400/60 dark:bg-emerald-950/30"
                      : "border-zinc-200 bg-white hover:-translate-y-px hover:border-emerald-400/60 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/40"
                  }`}
                >
                  <div
                    className={`flex size-9 items-center justify-center rounded-md bg-gradient-to-br ${t.accent} text-white shadow-sm`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        selected
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      {t.label}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {t.hint}
                    </p>
                  </div>
                  {selected ? (
                    <span
                      aria-hidden
                      className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white shadow"
                    >
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* Paso 2 — detalles */}
        <section
          aria-labelledby="step-details"
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          {/* Accent line: gradiente del tipo activo */}
          <div className={`h-1 bg-gradient-to-r ${active.accent}`} />
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50/60 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-semibold text-white">
              2
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="step-details"
                className="font-mono text-xs uppercase tracking-widest text-zinc-700 dark:text-zinc-200"
              >
                &gt; item.details
              </h2>
              <p className="text-xs text-zinc-500">
                Detalles de {active.label.toLowerCase()} · {active.hint.toLowerCase()}
              </p>
            </div>
            <div
              className={`flex size-8 items-center justify-center rounded-md bg-gradient-to-br ${active.accent} text-white shadow-sm`}
            >
              <active.icon className="size-4" />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <FormForType type={type} />
          </div>
        </section>

        {/* Footer nota: recordatorio zero-knowledge */}
        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
          &gt; ningun campo sensible sale de tu navegador en claro
        </p>
      </div>
    </div>
  );
}

export default function NewVaultItemPage() {
  return (
    <VaultGate>
      <NewItemInner />
    </VaultGate>
  );
}
