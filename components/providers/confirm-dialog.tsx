"use client";

// Reemplazo accesible de window.confirm() con API de promesa:
//   const ok = await confirmDialog({ title, description, destructive });
// Un solo dialogo global montado en RootLayout; role="alertdialog",
// Escape cancela, focus inicial en Cancelar (opcion segura).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true -> boton de confirmar en rojo (acciones irreversibles). */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirm requiere <ConfirmDialogProvider> en el arbol");
  return fn;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  const close = useCallback(
    (value: boolean) => {
      pending?.resolve(value);
      setPending(null);
    },
    [pending],
  );

  useEffect(() => {
    if (!pending) return;
    cancelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={pending.options.description ? "confirm-desc" : undefined}
            className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-base font-semibold">
              {pending.options.title}
            </h2>
            {pending.options.description ? (
              <p id="confirm-desc" className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                {pending.options.description}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button ref={cancelRef} variant="outline" onClick={() => close(false)}>
                {pending.options.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                variant={pending.options.destructive ? "destructive" : "default"}
                onClick={() => close(true)}
              >
                {pending.options.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
