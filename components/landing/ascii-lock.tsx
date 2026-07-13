"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Silueta ASCII del candado. '#' = celda visible que se rellena con un char
// aleatorio de ciphertext y muta en el tiempo; ' ' = fondo.
const LOCK_TEMPLATE = [
  "          ##########          ",
  "        ##############        ",
  "      ####          ####      ",
  "     ###              ###     ",
  "     ##                ##     ",
  "     ##                ##     ",
  "     ##                ##     ",
  "     ##                ##     ",
  "     ##                ##     ",
  "  ############################",
  "  ############################",
  "  ############################",
  "  ###########      ###########",
  "  ###########      ###########",
  "  ###########      ###########",
  "  ###########      ###########",
  "  ############################",
  "  ############################",
  "  ############################",
  "  ############################",
  "  ############################",
];

const CIPHER_CHARS = "0123456789abcdefABCDEF+/=$*#&%!?@";

function randChar(): string {
  return CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)] ?? "0";
}

interface Cell {
  row: number;
  col: number;
}

// Extrae la lista de celdas '#' del template para poder mutarlas por índice.
function buildCells(): Cell[] {
  const cells: Cell[] = [];
  LOCK_TEMPLATE.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      if (line[col] === "#") cells.push({ row, col });
    }
  });
  return cells;
}

export function AsciiLock() {
  const cells = useMemo(() => buildCells(), []);
  const [chars, setChars] = useState<string[]>(() =>
    cells.map(() => randChar()),
  );
  const frameRef = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // ~20% de las celdas mutan por tick. Da sensación de "descifrado" constante
    // sin quemar CPU: 12 ticks/s * ~70 celdas = ~840 mutaciones/s a ~350 celdas.
    const CHUNK = Math.max(1, Math.floor(cells.length * 0.2));
    const interval = window.setInterval(() => {
      setChars((prev) => {
        const next = prev.slice();
        for (let i = 0; i < CHUNK; i++) {
          const idx = Math.floor(Math.random() * next.length);
          next[idx] = randChar();
        }
        return next;
      });
      frameRef.current += 1;
    }, 80);

    return () => window.clearInterval(interval);
  }, [cells.length]);

  // Construye cada línea sustituyendo '#' por el char mutable en su índice.
  let cellIdx = 0;
  const rendered = LOCK_TEMPLATE.map((line, row) => {
    const parts: string[] = [];
    for (let col = 0; col < line.length; col++) {
      if (line[col] === "#") {
        parts.push(chars[cellIdx] ?? " ");
        cellIdx++;
      } else {
        parts.push(" ");
      }
    }
    return (
      <div key={row} className="whitespace-pre">
        {parts.join("")}
      </div>
    );
  });

  return (
    <pre
      aria-hidden
      className="pointer-events-none select-none text-center font-mono text-xs leading-[1] text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.55)] sm:text-base md:text-xl lg:text-2xl"
    >
      {rendered}
    </pre>
  );
}
