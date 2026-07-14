"use client";

import { useProfileCache } from "@/store/profile";

// Badge con inicial + email del usuario. Usa el ProfileCache — evita un
// getUser() server-side extra en cada navegacion a home.
export function UserBadge() {
  const profile = useProfileCache((s) => s.profile);
  const email = profile?.email ?? "";
  const initial = (email || "?").charAt(0).toUpperCase();

  return (
    <div className="hidden items-center gap-2.5 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-3.5 text-xs shadow-sm sm:flex dark:border-zinc-800 dark:bg-zinc-900">
      <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-semibold text-white shadow-inner">
        {initial}
      </span>
      <span className="font-medium text-zinc-700 dark:text-zinc-200">{email}</span>
    </div>
  );
}
