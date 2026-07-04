"use client";

import { errorMessage } from "@/lib/errors";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/services/auth";

export function GoogleButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // No redirigimos: signInWithOAuth cambia la URL sola.
    } catch (err) {
      setError(errorMessage(err, "Error de OAuth"));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleClick}
        disabled={disabled || loading}
      >
        {loading ? "Redirigiendo…" : "Continuar con Google"}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
