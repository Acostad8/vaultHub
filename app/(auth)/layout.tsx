import Link from "next/link";
import type { ReactNode } from "react";
import { VT323 } from "next/font/google";

import { Logo } from "@/components/ui/logo";
import { MatrixRain } from "@/components/landing/matrix-rain";

// Misma fuente terminal de la landing para mantener coherencia visual.
const vt323 = VT323({
  variable: "--font-terminal",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Layout de todas las paginas /login, /register, /forgot-password, /reset-password,
// /check-email, /mfa. Estetica terminal negra + verde alineada con la landing.
// El form real vive dentro de un panel emerald semitransparente para que quede
// legible sobre el fondo animado.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${vt323.variable} dark relative min-h-screen bg-black text-emerald-100`}
      style={{ ["--font-geist-mono" as string]: "var(--font-terminal)" }}
    >
      {/* Header consistente con la landing */}
      <header className="relative z-20 border-b border-emerald-500/15 bg-black/60 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-mono text-emerald-200">
            <Logo className="size-8" />
            <span className="text-2xl font-semibold tracking-tight sm:text-3xl">
              vaulthub<span className="text-emerald-400">_</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 font-mono text-sm sm:gap-4 sm:text-base">
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-emerald-300/80 transition-colors hover:text-emerald-200"
            >
              inicio
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-emerald-200 transition-colors hover:border-emerald-400 hover:bg-emerald-500/20"
            >
              crear vault →
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative flex min-h-[calc(100vh-4rem)]">
        {/* Panel izquierdo (desktop): manifiesto sobre matrix rain */}
        <aside className="relative hidden overflow-hidden border-r border-emerald-500/15 lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
          <div className="pointer-events-none absolute inset-0">
            <MatrixRain />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_55%),radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_55%,rgba(0,0,0,0.95)_100%)]" />
          </div>

          <div className="relative z-10 flex w-max items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-300 sm:text-xs">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
            zero-knowledge auth
          </div>

          <div className="relative z-10 space-y-5">
            <p className="font-mono text-xs uppercase tracking-widest text-emerald-400/70">
              &gt; identity.verify
            </p>
            <h2 className="font-mono text-4xl leading-[1.15] text-emerald-100 lg:text-5xl">
              Tu vault, cifrado en tu navegador.
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-200 to-teal-200 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(52,211,153,0.35)]">
                Nadie mas puede leerlo.
              </span>
            </h2>
            <p className="max-w-md text-sm text-emerald-200/70">
              PBKDF2 con 600 000 iteraciones y AES-256-GCM. El servidor solo almacena ciphertext —
              ni siquiera nosotros podemos leer lo que guardas.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 font-mono text-[10px] uppercase tracking-widest text-emerald-300/80">
              <span className="rounded-full border border-emerald-500/25 bg-black/50 px-3 py-1">
                AES-256-GCM
              </span>
              <span className="rounded-full border border-emerald-500/25 bg-black/50 px-3 py-1">
                PBKDF2 · 600k
              </span>
              <span className="rounded-full border border-emerald-500/25 bg-black/50 px-3 py-1">
                Web Crypto
              </span>
            </div>
          </div>

          <p className="relative z-10 font-mono text-xs text-emerald-500/60">
            © {new Date().getFullYear()} vaulthub · zero-knowledge by design
          </p>
        </aside>

        {/* Panel derecho: form dentro de "terminal window" coherente con la estetica */}
        <main className="relative flex flex-1 items-center justify-center px-4 py-6 sm:px-8">
          {/* Glow sutil detras del form (no domina) */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.08),transparent_60%)]" />
          <div className="relative z-10 w-full max-w-md">
            {/* Branding solo mobile */}
            <Link
              href="/"
              className="mb-4 flex items-center justify-center gap-2 font-mono text-emerald-200 lg:hidden"
            >
              <Logo className="size-7" />
              <span className="text-xl font-semibold tracking-tight">
                vaulthub<span className="text-emerald-400">_</span>
              </span>
            </Link>
            {/* Terminal window: barra superior + cuerpo con scanlines. Reemplaza la
                card generica por un chrome consistente con la landing. */}
            <div className="overflow-hidden rounded-lg border border-emerald-500/25 bg-black/80 shadow-[0_0_60px_-20px_rgba(52,211,153,0.5)] backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-emerald-300/70">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-400/70 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <span className="size-2.5 rounded-full bg-emerald-500/40" />
                  <span className="size-2.5 rounded-full bg-emerald-500/25" />
                </div>
                <span>~/vaulthub/auth</span>
                <span className="opacity-60">tty1</span>
              </div>
              <div
                className="relative px-5 py-5 sm:px-6 sm:py-6"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(180deg, transparent 0 2px, rgba(52,211,153,0.03) 2px 3px)",
                }}
              >
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
