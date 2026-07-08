"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { PLATFORM_PRESETS, searchPlatforms, type PlatformPreset } from "@/constants/platforms";
import { PlatformIcon } from "./platform-icon";

interface Props {
  onSelect: (preset: PlatformPreset) => void;
}

// Selector opcional de plataforma popular: pre-llena nombre + URL del item.
// Colapsado por defecto para no estorbar si el usuario escribe manualmente.
export function PlatformPicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const results = useMemo(() => searchPlatforms(query), [query]);

  function handlePick(preset: PlatformPreset) {
    setSelected(preset.slug);
    onSelect(preset);
    setOpen(false);
  }

  const selectedPreset = PLATFORM_PRESETS.find((p) => p.slug === selected);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {selectedPreset ? (
            <>
              <span className="flex size-6 items-center justify-center rounded bg-white ring-1 ring-zinc-200 dark:ring-zinc-700">
                <PlatformIcon slug={selectedPreset.slug} className="size-3.5" />
              </span>
              <span className="font-medium">{selectedPreset.name}</span>
            </>
          ) : (
            <span className="text-zinc-500">Elegir plataforma popular (opcional)</span>
          )}
        </span>
        <ChevronDown
          className={`size-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="relative mb-3">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar plataforma…"
              className="pl-8"
              autoFocus
            />
          </div>
          <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
            {results.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => handlePick(p)}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition ${
                  selected === p.slug
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-white ring-1 ring-zinc-200 dark:ring-zinc-700">
                  <PlatformIcon slug={p.slug} className="size-3.5" />
                </span>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            {results.length === 0 ? (
              <p className="col-span-full py-4 text-center text-xs text-zinc-500">
                Sin resultados — escribe el nombre manualmente abajo.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
