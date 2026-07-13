import Link from "next/link";
import { Activity, Archive, Folder, MonitorSmartphone, Plus, Share2, ShieldCheck, Sparkles, Tag, Trash2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { VaultGate } from "@/components/vault/vault-gate";
import { VaultList } from "@/components/vault/vault-list";
import { UserBadge } from "@/components/vault/user-badge";
import { BackupReminderBanner } from "@/components/vault/backup-reminder-banner";

export default function VaultHome() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header sticky con glass effect */}
      <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/vault" className="flex items-center gap-2">
            <Logo className="size-5" />
            <span className="text-base font-semibold tracking-tight">VaultHub</span>
          </Link>
          <div className="flex items-center gap-3">
            <UserBadge />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8">
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
              href="/backup"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <Archive className="size-4" />
              Backup
            </Link>
            <Link
              href="/audit"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <Activity className="size-4" />
              Actividad
            </Link>
            <Link
              href="/devices"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <MonitorSmartphone className="size-4" />
              Dispositivos
            </Link>
            <Link
              href="/security"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <ShieldCheck className="size-4" />
              Seguridad
            </Link>
            <Link
              href="/shared"
              className={buttonVariants({ variant: "outline", className: "gap-2" })}
            >
              <Share2 className="size-4" />
              Compartidos
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
          <div className="mb-4">
            <BackupReminderBanner />
          </div>
          <VaultList />
        </VaultGate>
      </main>
    </div>
  );
}
