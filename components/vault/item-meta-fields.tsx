"use client";

import { CategorySelect } from "./category-select";
import { TagSelector } from "./tag-selector";

interface Props {
  categoryId: string | null;
  onCategoryChange: (v: string | null) => void;
  tagIds: string[];
  onTagsChange: (v: string[]) => void;
  isFavorite: boolean;
  onFavoriteChange: (v: boolean) => void;
  disabled?: boolean;
}

export function ItemMetaFields({
  categoryId,
  onCategoryChange,
  tagIds,
  onTagsChange,
  isFavorite,
  onFavoriteChange,
  disabled,
}: Props) {
  return (
    <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <CategorySelect value={categoryId} onChange={onCategoryChange} disabled={disabled} />
      <TagSelector selectedTagIds={tagIds} onChange={onTagsChange} disabled={disabled} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isFavorite}
          onChange={(e) => onFavoriteChange(e.target.checked)}
          disabled={disabled}
        />
        Marcar como favorito
      </label>
    </div>
  );
}
