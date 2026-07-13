"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Folder, GripVertical, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DecryptedCategory } from "@/services/categories";

interface SortableCategoryItemProps {
  category: DecryptedCategory;
  editing: boolean;
  editName: string;
  onEditNameChange: (name: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onKeyboardMove: (delta: -1 | 1) => void;
}

export function SortableCategoryItem({
  category,
  editing,
  editName,
  onEditNameChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onKeyboardMove,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });
  const handleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = handleRef.current;
    if (editing && el && el === document.activeElement) {
      el.blur();
    }
  }, [editing]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (editing) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onKeyboardMove(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onKeyboardMove(1);
    }
  }

  return (
    <li ref={setNodeRef} style={style}>
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <button
            ref={(node) => {
              setActivatorNodeRef(node);
              handleRef.current = node;
            }}
            type="button"
            {...attributes}
            {...listeners}
            onKeyDown={handleKeyDown}
            aria-label={`Reordenar ${category.name}. Usa flechas arriba y abajo para mover.`}
            className="cursor-grab touch-none rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 active:cursor-grabbing dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="Arrastrar para reordenar (o flechas ↑↓)"
          >
            <GripVertical className="size-4" />
          </button>

          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: category.color ?? "#e4e4e7" }}
          >
            <Folder className="size-4 text-white/95" />
          </div>

          {editing ? (
            <>
              <Input
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSaveEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    onCancelEdit();
                  }
                }}
                className="flex-1"
                autoFocus
              />
              <Button size="sm" onClick={onSaveEdit} className="gap-1">
                <Check className="size-3.5" />
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelEdit} aria-label="Cancelar">
                <X className="size-3.5" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm font-medium">{category.name}</span>
              <button
                type="button"
                onClick={onStartEdit}
                className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="Renombrar"
                aria-label={`Renombrar ${category.name}`}
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-md p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                title="Borrar"
                aria-label={`Borrar ${category.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </Card>
    </li>
  );
}
