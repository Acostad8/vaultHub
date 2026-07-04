"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/services/auth";
import { useVaultLock } from "@/store/vault-lock";

export function LogoutButton() {
  const router = useRouter();
  const lockVault = useVaultLock((s) => s.lock);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    // Regla dura: limpiar master key ANTES de cerrar sesion — evita que
    // quede accesible aunque el signOut tarde o falle.
    lockVault();
    try {
      await signOut();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={loading}
      aria-label={loading ? "Cerrando sesion" : "Cerrar sesion"}
      title="Cerrar sesion"
    >
      <LogOut className="size-4" />
    </Button>
  );
}
