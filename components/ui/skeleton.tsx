import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-zinc-200/70 dark:bg-zinc-800/70", className)}
    />
  );
}
