"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const TYPES: Array<{ value: VaultItemType; label: string }> = [
  { value: "password", label: "Password" },
  { value: "note", label: "Nota" },
  { value: "api_key", label: "API Key" },
  { value: "ssh_key", label: "Clave SSH" },
  { value: "card", label: "Tarjeta" },
  { value: "identity", label: "Identidad" },
  { value: "totp", label: "TOTP" },
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

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Button
                key={t.value}
                type="button"
                size="xs"
                variant={t.value === type ? "default" : "outline"}
                onClick={() => setType(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <FormForType type={type} />
          <p className="mt-4 text-center text-xs">
            <Link href="/" className="text-zinc-500 underline underline-offset-4">
              Volver
            </Link>
          </p>
        </CardContent>
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
