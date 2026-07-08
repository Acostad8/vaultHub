import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";

// Layout del area autenticada. La verificacion de sesion la hace el proxy
// (lib/supabase/middleware.ts) via getClaims — evita un roundtrip HTTP
// server-side por navegacion. El gate por vault (initialized + unlocked)
// se hace en las paginas concretas / client.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="fixed right-4 bottom-4 z-30">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
