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

// Firma oculta: cada ~15s durante 500ms, 6 celdas centrales de la fila 14 se
// congelan y deletrean "ACOSTA" en vez de mutar. Guiño al autor sin romper la
// estetica. Fila 14 = cuerpo inferior del candado, justo bajo el keyhole.
const SIGNATURE = "ACOSTA";
const SIGNATURE_ROW = 14;
const SIGNATURE_START_COL = 12;
const SIGNATURE_INTERVAL_MS = 15_000;
const SIGNATURE_DURATION_MS = 500;

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
  // Indices en `cells` de las 6 celdas donde se dibujara la firma cuando pulse.
  // Se precomputa una vez para no recorrer en cada render.
  const signatureIndices = useMemo(() => {
    const idxs: number[] = [];
    for (let i = 0; i < SIGNATURE.length; i++) {
      const targetCol = SIGNATURE_START_COL + i;
      const idx = cells.findIndex(
        (c) => c.row === SIGNATURE_ROW && c.col === targetCol,
      );
      if (idx >= 0) idxs.push(idx);
    }
    return idxs;
  }, [cells]);
  // Init determinista para SSR: mismo output server/cliente evita hydration mismatch.
  // Se randomiza en useEffect tras el mount.
  const [chars, setChars] = useState<string[]>(() => cells.map(() => "0"));
  const [signatureActive, setSignatureActive] = useState(false);
  const frameRef = useRef(0);

  useEffect(() => {
    // rAF diferido evita setState sincrono en effect (react-hooks/set-state-in-effect)
    // y sigue randomizando post-mount para romper el placeholder "0000..." de SSR.
    const initRaf = requestAnimationFrame(() => {
      setChars(cells.map(() => randChar()));
    });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      return () => cancelAnimationFrame(initRaf);
    }

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

    // Pulso firma: cada SIGNATURE_INTERVAL_MS activa la firma por
    // SIGNATURE_DURATION_MS. Se guarda el timeout para poder limpiarlo si el
    // componente desmonta durante un pulso.
    let hideTimeout: number | null = null;
    const signaturePulse = window.setInterval(() => {
      setSignatureActive(true);
      if (hideTimeout !== null) window.clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(() => {
        setSignatureActive(false);
        hideTimeout = null;
      }, SIGNATURE_DURATION_MS);
    }, SIGNATURE_INTERVAL_MS);

    return () => {
      cancelAnimationFrame(initRaf);
      window.clearInterval(interval);
      window.clearInterval(signaturePulse);
      if (hideTimeout !== null) window.clearTimeout(hideTimeout);
    };
  }, [cells]);

  // Construye cada línea sustituyendo '#' por el char mutable en su índice.
  // Cuando signatureActive, las celdas de signatureIndices muestran los chars
  // de SIGNATURE en vez del hex random (firma oculta pulsante).
  let cellIdx = 0;
  const rendered = LOCK_TEMPLATE.map((line, row) => {
    const parts: string[] = [];
    for (let col = 0; col < line.length; col++) {
      if (line[col] === "#") {
        const sigPos = signatureActive ? signatureIndices.indexOf(cellIdx) : -1;
        parts.push(sigPos >= 0 ? (SIGNATURE[sigPos] ?? " ") : (chars[cellIdx] ?? " "));
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
        className="text-center font-mono text-xs leading-[1] text-emerald-300 drop-shadow-[0_44px_54px_rgba(0,0,0,0.78)] sm:text-base md:text-xl lg:text-2xl [transform:rotateY(-18deg)_rotateX(22deg)] [transform-origin:center_center] [text-shadow:1px_1px_0_#0f5a3d,2px_2px_0_#0e5237,3px_3px_0_#0d4a32,4px_4px_0_#0b422c,5px_5px_0_#0a3b27,6px_6px_0_#093524,7px_7px_0_#082e1f,8px_8px_0_#07281b,9px_9px_0_#062217,10px_10px_0_#051d13,11px_11px_0_#04170f,12px_12px_0_#03130c,13px_13px_0_#020e08,14px_14px_0_#020a06,15px_15px_0_#010704,16px_16px_0_#010503,17px_17px_0_#010403,18px_18px_0_#000302,19px_19px_0_#000201,20px_20px_0_#000101,21px_21px_0_#000000,22px_22px_22px_rgba(0,0,0,0.8),0_0_26px_rgba(52,211,153,0.55)]"
      >
        {rendered}
      </pre>
    </div>
  );
}
