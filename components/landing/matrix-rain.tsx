"use client";

import { useEffect, useRef } from "react";

// Tokens que "llueven": mezcla de hex, binario, hashes cortos, primitivas cripto.
// Se leen como fragmentos de material cifrado.
const TOKENS = [
  "A7F2",
  "9C4D",
  "0xFA12",
  "SHA256",
  "AES-256",
  "9f8e7d",
  "PBKDF2",
  "GCM",
  "IV",
  "salt",
  "01001110",
  "10110101",
  "0xB33F",
  "d41d8c",
  "ec4a2f",
  "600000",
  "HKDF",
  "0xDEAD",
  "0xBEEF",
  "3b0c1e",
  "AF12",
  "7A9E",
  "11010010",
  "00110101",
  "keyDerive",
  "cipher",
  "0x5A2F",
];

const CHAR_SIZE = 14; // px por celda vertical
const FALL_MIN = 0.35;
const FALL_MAX = 1.1;

interface Drop {
  x: number;
  y: number;
  speed: number;
  token: string;
  swapAt: number;
}

function pickToken(): string {
  return TOKENS[Math.floor(Math.random() * TOKENS.length)] ?? "0000";
}

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let drops: Drop[] = [];
    let raf = 0;
    let last = performance.now();

    function resize() {
      const parent = canvas!.parentElement ?? document.body;
      dpr = window.devicePixelRatio || 1;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // VT323 tiende a renderizar delgado en canvas; se sube el tamaño para
      // compensar y mantener presencia visual.
      ctx!.font = `16px "VT323", "JetBrains Mono", ui-monospace, monospace`;
      ctx!.textBaseline = "top";

      // Densidad: una columna aprox cada 90px de ancho.
      const columns = Math.max(8, Math.floor(width / 90));
      drops = Array.from({ length: columns }, (_, i) => ({
        x: (i + 0.5) * (width / columns) + (Math.random() - 0.5) * 20,
        y: Math.random() * height,
        speed: FALL_MIN + Math.random() * (FALL_MAX - FALL_MIN),
        token: pickToken(),
        swapAt: performance.now() + 400 + Math.random() * 2000,
      }));
    }

    function drawStatic() {
      // Modo reduced-motion: pintar un fondo con tokens fijos, sin loop.
      ctx!.fillStyle = "rgba(0,0,0,1)";
      ctx!.fillRect(0, 0, width, height);
      ctx!.fillStyle = "rgba(52, 211, 153, 0.25)";
      const step = 32;
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += 110) {
          ctx!.fillText(pickToken(), x, y);
        }
      }
    }

    function frame(now: number) {
      const dt = Math.min(48, now - last);
      last = now;

      // Trail: capa translúcida oscura por frame para ir apagando lo viejo.
      ctx!.fillStyle = "rgba(4, 8, 6, 0.08)";
      ctx!.fillRect(0, 0, width, height);

      for (const d of drops) {
        d.y += d.speed * (dt * 0.06) * CHAR_SIZE;
        if (d.y > height + 40) {
          d.y = -CHAR_SIZE * (2 + Math.random() * 6);
          d.speed = FALL_MIN + Math.random() * (FALL_MAX - FALL_MIN);
          d.token = pickToken();
        }
        if (now >= d.swapAt) {
          d.token = pickToken();
          d.swapAt = now + 400 + Math.random() * 2200;
        }
        // Cabeza brillante.
        ctx!.fillStyle = "rgba(167, 243, 208, 0.95)";
        ctx!.fillText(d.token, d.x, d.y);
        // Rastro apagado un poco arriba.
        ctx!.fillStyle = "rgba(52, 211, 153, 0.45)";
        ctx!.fillText(d.token, d.x, d.y - CHAR_SIZE * 1.6);
        ctx!.fillStyle = "rgba(16, 185, 129, 0.22)";
        ctx!.fillText(d.token, d.x, d.y - CHAR_SIZE * 3.2);
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement ?? document.body);

    if (reduced) {
      drawStatic();
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
