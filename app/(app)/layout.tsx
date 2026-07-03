import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Layout del area autenticada. Solo verifica sesion; el gate por vault
// (initialized + unlocked) se hace en las paginas concretas / client.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <div className="flex min-h-screen flex-col">{children}</div>;
}
