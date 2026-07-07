"use client";

import { useProfileCache } from "@/store/profile";

// Badge con el email + inicial del usuario. Usa el ProfileCache — evita un
// getUser() server-side extra en cada navegacion a home.
export function UserBadge() {
  const profile = useProfileCache((s) => s.profile);
  const email = profile?.email ?? "";
  const initial = (email || "?").charAt(0).toUpperCase();

  return (
    <div className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs sm:flex dark:border-zinc-800 dark:bg-zinc-900">
      <span className="flex size-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
        {initial}
      </span>
      <span className="text-zinc-600 dark:text-zinc-300">{email}</span>
    </div>
  );
}
