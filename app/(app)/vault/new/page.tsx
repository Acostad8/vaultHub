"use client";

import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VaultGate } from "@/components/vault/vault-gate";
import { PasswordItemForm } from "@/components/vault/password-item-form";

export default function NewVaultItemPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <VaultGate>
        <Card>
          <CardHeader>
            <CardTitle>Nuevo item</CardTitle>
            <CardDescription>
              Todo se cifra localmente antes de enviarse. Otros tipos (SSH, tarjeta, etc.) en fases
              futuras — por ahora solo password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordItemForm mode="create" />
            <p className="mt-4 text-center text-xs">
              <Link href="/" className="text-zinc-500 underline underline-offset-4">
                Volver
              </Link>
            </p>
          </CardContent>
        </Card>
      </VaultGate>
    </div>
  );
}
