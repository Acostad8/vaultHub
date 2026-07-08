"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemeKey = "light" | "dark" | "system";

const OPTIONS: { key: ThemeKey; label: string; Icon: typeof Sun }[] = [
  { key: "light", label: "Claro", Icon: Sun },
  { key: "dark", label: "Oscuro", Icon: Moon },
  { key: "system", label: "Sistema", Icon: Monitor },
];

// mounted-check via useSyncExternalStore: durante SSR devuelve false, tras
// hydration devuelve true. Evita hydration mismatch cuando pintamos el
// estado activo del toggle (que depende de localStorage / prefers-color-scheme).
const subscribe = () => () => {};
const useHasMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

// Toggle tri-estado (light / dark / system). Segmented control accesible.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="inline-flex items-center rounded-full border border-zinc-200 bg-white p-0.5 text-xs dark:border-zinc-800 dark:bg-zinc-900"
    >
      {OPTIONS.map(({ key, label, Icon }) => {
        const active = mounted && theme === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(key)}
            className={
              "flex size-7 items-center justify-center rounded-full transition-colors " +
              (active
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100")
            }
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
