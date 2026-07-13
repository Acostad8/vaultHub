"use client";

import { useEffect, useRef, useState } from "react";

// Estados del ciclo: password en claro → bcrypt-like → hex → binario. Loop.
interface Stage {
  label: string;
  value: string;
}
const STAGES: Stage[] = [
  { label: "plain", value: "MyPass123!" },
  { label: "bcrypt", value: "$2b$12$9xF7kL9pQeRt.aBcDeFgHi" },
  { label: "hex", value: "A91F7CDEB240 8F1C9E2A B7D5" },
  { label: "binary", value: "01001101 01111001 01010000" },
];
const FIRST_STAGE: Stage = STAGES[0]!;

function stageAt(idx: number): Stage {
  return STAGES[((idx % STAGES.length) + STAGES.length) % STAGES.length] ?? FIRST_STAGE;
}

const CIPHER_POOL = "0123456789abcdefABCDEF+/=$*#&%!?@";
const SCRAMBLE_FRAMES = 26; // duración por char en frames
const HOLD_MS = 1600;

function pick(): string {
  return CIPHER_POOL[Math.floor(Math.random() * CIPHER_POOL.length)] ?? "0";
}

/**
 * Devuelve un frame intermedio entre `from` y `to`.
 * Cada índice tiene una "hora de aterrizaje" progresiva de izq→der para dar
 * sensación de descifrado; antes de esa hora, muestra un char aleatorio.
 */
function morphFrame(from: string, to: string, tick: number): string {
  const len = Math.max(from.length, to.length);
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    const landsAt = 6 + i * 0.9;
    const target = to[i] ?? " ";
    if (tick >= landsAt + SCRAMBLE_FRAMES * 0.4) {
      out.push(target);
    } else if (tick >= landsAt) {
      out.push(pick());
    } else {
      out.push(from[i] ?? " ");
    }
  }
  return out.join("");
}

export function CipherDemo() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [display, setDisplay] = useState(FIRST_STAGE.value);
  const [labelIdx, setLabelIdx] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setStarted(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Reduced-motion: no animar. Se deja el plaintext inicial visible para que
    // el usuario entienda el concepto sin distracción.
    if (reduced) return;

    let cancelled = false;
    let stage = 0;

    async function runStage(nextStage: number) {
      const from = stageAt(stage).value;
      const to = stageAt(nextStage).value;
      const totalTicks =
        6 + Math.max(from.length, to.length) * 0.9 + SCRAMBLE_FRAMES * 0.4 + 4;
      for (let t = 0; t <= totalTicks; t++) {
        if (cancelled) return;
        setDisplay(morphFrame(from, to, t));
        await new Promise((r) => setTimeout(r, 40));
      }
      setDisplay(to);
      setLabelIdx(nextStage);
      stage = nextStage;
    }

    async function loop() {
      // Un pequeño delay antes del primer morph para que se lea el estado inicial.
      await new Promise((r) => setTimeout(r, 500));
      while (!cancelled) {
        const next = (stage + 1) % STAGES.length;
        await runStage(next);
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, HOLD_MS));
      }
    }
    void loop();
    return () => {
      cancelled = true;
    };
  }, [started]);

  const stage = stageAt(labelIdx);

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-emerald-500/25 bg-black/60 p-6 font-mono shadow-[0_0_60px_-15px_rgba(52,211,153,0.35)] backdrop-blur-sm sm:p-8"
    >
      <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-3 text-xs text-emerald-400/70">
        <span className="inline-block size-2 rounded-full bg-red-400/80" />
        <span className="inline-block size-2 rounded-full bg-yellow-400/80" />
        <span className="inline-block size-2 rounded-full bg-emerald-400/80" />
        <span className="ml-2">vault@zero-knowledge:~$</span>
      </div>

      <div className="mt-5 space-y-4 text-sm sm:text-base">
        <div className="flex items-baseline gap-3 text-emerald-400/60">
          <span className="w-20 shrink-0 text-emerald-500/50">stage</span>
          <span className="text-emerald-300">{stage.label}</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="w-20 shrink-0 text-emerald-500/50">value</span>
          <span
            className="break-all text-emerald-200 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]"
            aria-live="polite"
          >
            {display}
          </span>
        </div>
        <div className="flex items-baseline gap-3 text-emerald-500/40">
          <span className="w-20 shrink-0">note</span>
          <span className="text-xs">
            Ninguna representación anterior a &quot;plain&quot; sale de tu navegador.
          </span>
        </div>
      </div>
    </div>
  );
}
