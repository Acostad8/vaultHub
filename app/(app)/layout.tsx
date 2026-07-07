import type { ReactNode } from "react";

// Layout del area autenticada. La verificacion de sesion la hace el proxy
// (lib/supabase/middleware.ts) via getClaims — evita un roundtrip HTTP
// server-side por navegacion. El gate por vault (initialized + unlocked)
// se hace en las paginas concretas / client.
export default function AppLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col">{children}</div>;
}
