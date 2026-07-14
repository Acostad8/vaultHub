"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import type { DecryptedCategory } from "@/services/categories";

interface SortableCategoryItemProps {
  category: DecryptedCategory;
  itemCount?: number;
  editing: boolean;
  editName: string;
  onEditNameChange: (name: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onKeyboardMove: (delta: -1 | 1) => void;
}

// Convierte hex a rgba(). Se usa para tintar sutilmente el borde/hover con el
// color propio de la categoria — mucho mas rico que el zinc plano.
function tintFromHex(hex: string | null | undefined, alpha: number): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return `rgba(161, 161, 170, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function SortableCategoryItem({
  category,
  itemCount,
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
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 10 : "auto",
    boxShadow: isDragging ? "0 12px 32px rgba(0, 0, 0, 0.18)" : undefined,
  };

  const initial = (category.name || "?").trim().charAt(0).toUpperCase();
  const accent = category.color ?? "#71717a";

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
      <article
        className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white transition-all hover:-translate-y-px hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60"
        style={{
          borderLeftWidth: "4px",
          borderLeftColor: accent,
        }}
      >
        {/* Franja de acento a la izquierda ya viene del border-left. El resto
            se ilumina sutilmente con el color de la categoria en hover. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{
            background: `linear-gradient(90deg, ${tintFromHex(accent, 0.08)}, transparent 40%)`,
          }}
        />

        <div className="relative flex items-center gap-3 px-3 py-3">
          <button
            ref={(node) => {
              setActivatorNodeRef(node);
              handleRef.current = node;
            }}
            type="button"
            {...attributes}
            {...listeners}
            onKeyDown={handleKeyDown}
            aria-label={`Reordenar ${category.name}. Usa flechas arriba y abajo.`}
            className="cursor-grab touch-none rounded-md p-1.5 text-zinc-400 opacity-60 transition-all hover:bg-zinc-100 hover:text-zinc-700 hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-emerald-400 active:cursor-grabbing group-hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="Arrastrar para reordenar (o flechas ↑↓ tras enfocar)"
          >
            <GripVertical className="size-4" />
          </button>

          {/* Avatar circular con la inicial en el color de la categoria */}
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-inner ring-2 ring-white dark:ring-zinc-900"
            style={{ backgroundColor: accent }}
            aria-hidden
          >
            {initial}
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
                className="h-9 flex-1"
                autoFocus
              />
              <button
                type="button"
                onClick={onSaveEdit}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              >
                <Check className="size-3.5" />
                Guardar
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                aria-label="Cancelar"
                className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
              >
                <X className="size-3.5" />
              </button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {category.name}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                  <span
                    className="font-mono uppercase tracking-widest"
                    style={{ color: accent }}
                    title={accent}
                  >
                    {accent}
                  </span>
                  {typeof itemCount === "number" ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                onClick={onStartEdit}
                className="rounded-md p-2 text-zinc-400 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-900 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                title="Renombrar"
                aria-label={`Renombrar ${category.name}`}
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-md p-2 text-zinc-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                title="Borrar"
                aria-label={`Borrar ${category.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </article>
    </li>
  );
}
