"use client";

import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { listDecryptedTags, type DecryptedTag } from "@/services/tags";

interface Props {
  selectedTagIds: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function TagSelector({ selectedTagIds, onChange, disabled }: Props) {
  const [items, setItems] = useState<DecryptedTag[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDecryptedTags()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    if (disabled) return;
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((t) => t !== id));
    } else {
      onChange([...selectedTagIds, id]);
    }
  }

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      {!items ? <p className="text-xs text-zinc-500">Cargando…</p> : null}
      {items && items.length === 0 ? (
        <p className="text-xs text-zinc-500">Aun no hay tags. Crea alguno en /tags.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {items?.map((tag) => {
          const selected = selectedTagIds.includes(tag.id);
          return (
            <button
              type="button"
              key={tag.id}
              onClick={() => toggle(tag.id)}
              disabled={disabled}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                selected
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {tag.color ? (
                <span
                  className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: tag.color }}
                />
              ) : null}
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
