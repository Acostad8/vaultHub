"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Silueta ASCII del candado. '#' = celda visible que se rellena con un char
// aleatorio de ciphertext y muta en el tiempo; ' ' = fondo.
// Ratio ancho/alto ~1:1 para que se vea cuadrado con leading-[1] en fuente mono
// (chars mono suelen tener aspect ~0.55 → ~30 cols x ~17 filas queda cuadrado).
const LOCK_TEMPLATE = [
  "          ##########          ",
  "        ##############        ",
  "       ###          ###       ",
  "      ##              ##      ",
  "      ##              ##      ",
  "      ##              ##      ",
  "      ##              ##      ",
  "  ############################",
  "  ############################",
  "  ############################",
  "  ###########      ###########",
  "  ###########      ###########",
  "  ###########      ###########",
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
  // Init determinista para SSR: mismo output server/cliente evita hydration mismatch.
  // Se randomiza en useEffect tras el mount.
  const [chars, setChars] = useState<string[]>(() => cells.map(() => "0"));
  const frameRef = useRef(0);

  useEffect(() => {
    setChars(cells.map(() => randChar()));

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
    // Contenedor con perspective activa transformaciones 3D reales sobre el pre.
    <div
      aria-hidden
      className="pointer-events-none select-none [perspective:1100px] [transform-style:preserve-3d]"
    >
      <pre
        className="text-center font-mono text-xs leading-[1] text-emerald-300 drop-shadow-[0_44px_54px_rgba(0,0,0,0.78)] sm:text-base md:text-xl lg:text-2xl [transform:rotateY(-18deg)_rotateX(12deg)] [transform-origin:center_center] [text-shadow:1px_1px_0_#0f5a3d,2px_2px_0_#0e5237,3px_3px_0_#0d4a32,4px_4px_0_#0b422c,5px_5px_0_#0a3b27,6px_6px_0_#093524,7px_7px_0_#082e1f,8px_8px_0_#07281b,9px_9px_0_#062217,10px_10px_0_#051d13,11px_11px_0_#04170f,12px_12px_0_#03130c,13px_13px_0_#020e08,14px_14px_0_#020a06,15px_15px_0_#010704,16px_16px_0_#010503,17px_17px_0_#010403,18px_18px_0_#000302,19px_19px_0_#000201,20px_20px_0_#000101,21px_21px_0_#000000,22px_22px_22px_rgba(0,0,0,0.8),0_0_26px_rgba(52,211,153,0.55)]"
      >
        {rendered}
      </pre>
    </div>
  );
}
