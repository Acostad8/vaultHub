"use client";

import { Ban, Check } from "lucide-react";

// Paleta fija: evita pedir hex/rgb al usuario. Nombres solo para aria-label.
const PALETTE: Array<{ hex: string; label: string }> = [
  { hex: "#ef4444", label: "Rojo" },
  { hex: "#f97316", label: "Naranja" },
  { hex: "#f59e0b", label: "Ambar" },
  { hex: "#84cc16", label: "Lima" },
  { hex: "#10b981", label: "Esmeralda" },
  { hex: "#06b6d4", label: "Cian" },
  { hex: "#3b82f6", label: "Azul" },
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#8b5cf6", label: "Violeta" },
  { hex: "#ec4899", label: "Rosa" },
  { hex: "#78716c", label: "Piedra" },
  { hex: "#64748b", label: "Gris" },
];

interface Props {
  /** Hex seleccionado ("" = sin color). */
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}

export function ColorSwatchPicker({ value, onChange, disabled }: Props) {
  return (
    <div role="radiogroup" aria-label="Color" className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        role="radio"
        aria-checked={value === ""}
        aria-label="Sin color"
        title="Sin color"
        disabled={disabled}
        onClick={() => onChange("")}
        className={`flex size-7 items-center justify-center rounded-full border text-zinc-400 transition ${
          value === ""
            ? "border-zinc-900 ring-2 ring-zinc-900/20 dark:border-zinc-100 dark:ring-zinc-100/20"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700"
        }`}
      >
        <Ban className="size-3.5" />
      </button>
      {PALETTE.map(({ hex, label }) => {
        const selected = value.toLowerCase() === hex;
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => onChange(hex)}
            style={{ backgroundColor: hex }}
            className={`flex size-7 items-center justify-center rounded-full transition ${
              selected
                ? "ring-2 ring-zinc-900/40 ring-offset-2 ring-offset-white dark:ring-zinc-100/50 dark:ring-offset-zinc-950"
                : "hover:scale-110"
            }`}
          >
            {selected ? <Check className="size-3.5 text-white" /> : null}
          </button>
        );
      })}
    </div>
  );
}
