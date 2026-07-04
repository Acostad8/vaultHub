import Link from "next/link";
import { Folder, Plus, Shield, Sparkles, Tag, Trash2 } from "lucide-react";

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

  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header sticky con glass effect */}
      <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="size-5" strokeWidth={2.2} />
            <span className="text-base font-semibold tracking-tight">VaultHub</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs sm:flex dark:border-zinc-800 dark:bg-zinc-900">
              <span className="flex size-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                {initial}
              </span>
              <span className="text-zinc-600 dark:text-zinc-300">{user?.email}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {/* Hero + quick actions */}
        <section className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tu vault</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Todo cifrado localmente antes de salir de tu navegador.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/vault/new"
              className={buttonVariants({ variant: "default", size: "lg", className: "gap-2" })}
            >
              <Plus className="size-4" />
              Nuevo item
            </Link>
            <Link
              href="/categories"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <Folder className="size-4" />
              Categorias
            </Link>
            <Link
              href="/tags"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <Tag className="size-4" />
              Tags
            </Link>
            <Link
              href="/generator"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <Sparkles className="size-4" />
              Generador
            </Link>
            <Link
              href="/trash"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <Trash2 className="size-4" />
              Papelera
            </Link>
          </div>
        </section>

        <VaultGate>
          <VaultList />
        </VaultGate>
      </main>
    </div>
  );
}
