"use client";

import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { listDecryptedCategories, type DecryptedCategory } from "@/services/categories";

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function CategorySelect({ value, onChange, disabled }: Props) {
  const [items, setItems] = useState<DecryptedCategory[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDecryptedCategories()
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

  return (
    <div className="space-y-2">
      <Label htmlFor="category">Categoria</Label>
      <select
        id="category"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className="w-full rounded-md border border-zinc-200 bg-transparent p-2 text-sm dark:border-zinc-800"
      >
        <option value="">Sin categoria</option>
        {items?.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
    </div>
  );
}
