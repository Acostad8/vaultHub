import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      {/* Panel izquierdo (solo desktop): branding + tagline sobre gradiente radial */}
      <aside className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12 lg:text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#4f46e5,#0f172a_60%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:22px_22px]" />

        <Link href="/" className="relative z-10 flex items-center gap-2 text-lg font-semibold">
          <Logo className="size-6" />
          VaultHub
        </Link>

        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Tu vault, cifrado en tu navegador.
            <br />
            <span className="text-white/70">Nadie mas puede leerlo.</span>
          </h2>
          <p className="max-w-md text-sm text-white/70">
            PBKDF2 con 600 000 iteraciones y AES-256-GCM. Zero-Knowledge por diseño: el servidor
            solo ve ciphertext.
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/50">
          &copy; {new Date().getFullYear()} VaultHub
        </p>
      </aside>

      {/* Panel derecho: form */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          {/* Branding solo mobile */}
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold lg:hidden"
          >
            <Logo className="size-5" />
            VaultHub
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
