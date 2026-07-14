"use client";

import { useEffect, useState } from "react";

// Secuencia Konami clasica: arriba arriba abajo abajo izq der izq der B A.
// Se compara case-insensitive para las letras finales.
const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

const AUTO_DISMISS_MS = 6000;

// Escucha keydown global. Cuando se detecta la secuencia Konami muestra un
// overlay con la firma del autor. Cerrable con Escape, click en el fondo, o
// auto-dismiss tras AUTO_DISMISS_MS. Ignora eventos originados en inputs.
export function KonamiEasterEgg() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let buffer: string[] = [];

    function handleKey(event: KeyboardEvent) {
      // No interferir si el usuario esta escribiendo en un input/textarea/editable.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape") {
        setVisible(false);
        return;
      }

      // Normalizar letras a minusculas; teclas especiales conservan nombre.
      const normalized = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      buffer.push(normalized);
      if (buffer.length > KONAMI_SEQUENCE.length) {
        buffer = buffer.slice(-KONAMI_SEQUENCE.length);
      }

      if (
        buffer.length === KONAMI_SEQUENCE.length &&
        KONAMI_SEQUENCE.every((k, i) => k === buffer[i])
      ) {
        setVisible(true);
        buffer = [];
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Auto-dismiss tras un rato.
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 px-4 backdrop-blur-md"
      role="dialog"
      aria-label="Firma del autor"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-md flex-col items-center gap-5 overflow-hidden rounded-xl border border-emerald-400/40 bg-black/90 px-8 py-10 text-center font-mono text-emerald-100 shadow-[0_0_80px_-10px_rgba(52,211,153,0.7)]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0 2px, rgba(52,211,153,0.04) 2px 3px)",
        }}
      >
        {/* Barra tipo terminal window */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-[10px] uppercase tracking-widest text-emerald-300/70">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="size-2 rounded-full bg-emerald-500/40" />
            <span className="size-2 rounded-full bg-emerald-500/25" />
          </div>
          <span>~/vaulthub/.hidden</span>
          <span className="opacity-60">tty0</span>
        </div>

        <p className="mt-8 text-xs uppercase tracking-widest text-emerald-400/70">
          &gt; access_granted
        </p>

        <div>
          <div className="mb-2 text-6xl font-bold tracking-[0.35em] text-emerald-300 drop-shadow-[0_0_20px_rgba(52,211,153,0.85)]">
            ACOSTA
          </div>
          <p className="text-sm text-emerald-200/70">
            crafted with cryptography · zero-knowledge by design
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-500/70">
          <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
          hidden signature unlocked
        </div>

        <button
          type="button"
          onClick={() => setVisible(false)}
          className="mt-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-widest text-emerald-200 transition-colors hover:border-emerald-400 hover:bg-emerald-500/20"
        >
          $ ./close
        </button>

        <p className="text-[10px] uppercase tracking-widest text-emerald-500/40">
          esc · click fuera · auto-cierre {AUTO_DISMISS_MS / 1000}s
        </p>
      </div>
    </div>
  );
}
