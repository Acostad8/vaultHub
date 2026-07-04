"use client";

import { useState } from "react";
import { CreditCard, FileText, IdCard, Key, KeyRound, ShieldCheck, Terminal } from "lucide-react";

import { Card } from "@/components/ui/card";
import { VaultGate } from "@/components/vault/vault-gate";
import { PageHeader } from "@/components/vault/page-header";
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

const TYPES: Array<{
  value: VaultItemType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}> = [
  { value: "password", label: "Password", icon: KeyRound, accent: "from-indigo-500 to-violet-600" },
  { value: "note", label: "Nota", icon: FileText, accent: "from-amber-500 to-orange-600" },
  { value: "api_key", label: "API Key", icon: Key, accent: "from-emerald-500 to-green-600" },
  { value: "ssh_key", label: "SSH", icon: Terminal, accent: "from-purple-500 to-fuchsia-600" },
  { value: "card", label: "Tarjeta", icon: CreditCard, accent: "from-rose-500 to-pink-600" },
  { value: "identity", label: "Identidad", icon: IdCard, accent: "from-cyan-500 to-sky-600" },
  { value: "totp", label: "TOTP", icon: ShieldCheck, accent: "from-teal-500 to-emerald-600" },
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
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <PageHeader title="Nuevo item" description="Todo se cifra localmente antes de salir." />

      <Card className="p-5">
        <div className="mb-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Tipo</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const selected = t.value === type;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition ${
                    selected
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  }`}
                >
                  <div
                    className={`flex size-8 items-center justify-center rounded-md ${
                      selected ? "bg-white/15" : `bg-gradient-to-br ${t.accent} text-white`
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <div
            className={`flex size-8 items-center justify-center rounded-md bg-gradient-to-br ${active.accent} text-white`}
          >
            <active.icon className="size-4" />
          </div>
          <span className="text-sm font-medium">Detalles de {active.label.toLowerCase()}</span>
        </div>

        <div className="mt-5">
          <FormForType type={type} />
        </div>
      </Card>
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
