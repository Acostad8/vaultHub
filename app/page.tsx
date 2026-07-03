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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">VaultHub</h1>
          <p className="text-xs text-zinc-500">{user?.email}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <Link
            href="/vault/new"
            className={buttonVariants({ variant: "default", className: "" })}
          >
            + Nuevo
          </Link>
          <Link
            href="/categories"
            className={buttonVariants({ variant: "outline", className: "" })}
          >
            Categorias
          </Link>
          <Link href="/tags" className={buttonVariants({ variant: "outline", className: "" })}>
            Tags
          </Link>
          <Link href="/trash" className={buttonVariants({ variant: "outline", className: "" })}>
            Papelera
          </Link>
          <LogoutButton />
        </nav>
      </header>
      <VaultGate>
        <VaultList />
      </VaultGate>
    </main>
  );
}
