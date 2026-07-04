"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";

import { Input } from "./input";
import { cn } from "@/lib/utils";

interface Props extends ComponentProps<typeof Input> {
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

// Input con soporte para icono izquierdo (decorativo) y slot derecho
// (boton, texto, etc.). El icono se posiciona absolute; el input compensa
// con padding.
export const InputWithIcon = forwardRef<HTMLInputElement, Props>(function InputWithIcon(
  { leftIcon, rightSlot, className, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {leftIcon ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
          {leftIcon}
        </div>
      ) : null}
      <Input
        ref={ref}
        {...rest}
        className={cn(leftIcon ? "pl-9" : undefined, rightSlot ? "pr-10" : undefined, className)}
      />
      {rightSlot ? (
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">{rightSlot}</div>
      ) : null}
    </div>
  );
});
