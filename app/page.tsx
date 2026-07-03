import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { VaultGate } from "@/components/vault/vault-gate";
import { VaultList } from "@/components/vault/vault-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">VaultHub</h1>
          <p className="text-xs text-zinc-500">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/vault/new"
            className={buttonVariants({ variant: "default", className: "" })}
          >
            + Nuevo item
          </Link>
          <LogoutButton />
        </div>
      </header>
      <VaultGate>
        <VaultList />
      </VaultGate>
    </main>
  );
}
