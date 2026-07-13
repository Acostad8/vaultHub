import Link from "next/link";
import { VT323 } from "next/font/google";
import {
  Fingerprint,
  KeyRound,
  Lock,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { AsciiLock } from "@/components/landing/ascii-lock";
import { CipherDemo } from "@/components/landing/cipher-demo";
import { MatrixRain } from "@/components/landing/matrix-rain";

// VT323: CRT terminal ochentera. Solo se carga en la landing (import per-route).
// Al asignar la variable a `--font-geist-mono` en el root de la landing, todos
// los `font-mono` de Tailwind dentro del scope pasan a usar VT323 sin tocar
// clases una por una.
const vt323 = VT323({
  variable: "--font-terminal",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Landing pública. Estética terminal / cripto: fondo oscuro forzado sin
// depender del tema, tipografía mono, verde fósforo para todo lo que "brilla".
export default function LandingPage() {
  return (
    <div
      className={`${vt323.variable} dark relative min-h-screen overflow-hidden bg-black text-emerald-100`}
      style={{ ["--font-geist-mono" as string]: "var(--font-terminal)" }}
    >
      {/* Fondo global: lluvia de tokens hex/binario/hash. */}
      <div className="pointer-events-none fixed inset-0">
        <MatrixRain />
        {/* Viñeta radial para que el contenido central respire por encima del ruido. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_45%,rgba(0,0,0,0.92)_100%)]" />
      </div>

      {/* Barra superior estilo prompt. */}
      <header className="relative z-10 border-b border-emerald-500/15 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-mono text-emerald-200">
            <Logo className="size-5" />
            <span className="text-sm font-semibold tracking-tight">
              vaulthub<span className="text-emerald-400">_</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 font-mono text-xs sm:gap-3 sm:text-sm">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-emerald-300/80 transition-colors hover:text-emerald-200"
            >
              login
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-emerald-200 transition-colors hover:border-emerald-400 hover:bg-emerald-500/20"
            >
              crear vault →
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO */}
        <section className="mx-auto flex min-h-[92vh] w-full max-w-6xl flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-8 flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-300 sm:text-xs">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
            zero-knowledge · AES-256-GCM · PBKDF2 600k
          </div>

          <div className="mb-10 w-full">
            <AsciiLock />
          </div>

          <h1 className="mx-auto max-w-3xl font-mono text-2xl leading-tight text-emerald-100 sm:text-4xl md:text-5xl">
            Tus credenciales.
            <br />
            Tu clave.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-200 to-teal-200 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(52,211,153,0.35)]">
              Solo tú puedes descifrarlas.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm text-emerald-200/70 sm:text-base">
            Cifrado extremo a extremo con arquitectura{" "}
            <span className="font-mono text-emerald-300">zero-knowledge</span>. El servidor solo
            almacena ciphertext — ni siquiera nosotros podemos leer lo que guardas.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-md border border-emerald-400/50 bg-emerald-500/15 px-5 py-2.5 font-mono text-sm text-emerald-100 shadow-[0_0_40px_-10px_rgba(52,211,153,0.6)] transition-all hover:border-emerald-300 hover:bg-emerald-500/25 hover:shadow-[0_0_60px_-10px_rgba(52,211,153,0.9)]"
            >
              <span className="text-emerald-400">$</span> ./init-vault
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-emerald-500/20 px-5 py-2.5 font-mono text-sm text-emerald-300/80 transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
            >
              <span className="text-emerald-500/60">$</span> ./unlock
            </Link>
          </div>

          <div className="mt-14 animate-bounce font-mono text-xs text-emerald-500/60">
            ↓ scroll · decrypt more
          </div>
        </section>

        {/* CIPHER DEMO */}
        <section className="relative border-t border-emerald-500/10 bg-black/40 py-24 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-4xl px-4">
            <div className="mb-10 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-emerald-400/70">
                &gt; observe.encryption
              </p>
              <h2 className="mt-3 font-mono text-2xl text-emerald-100 sm:text-3xl md:text-4xl">
                Así viaja tu password.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-emerald-200/60">
                Antes de salir de tu navegador se transforma en ciphertext. El servidor solo ve la
                última forma.
              </p>
            </div>
            <CipherDemo />
          </div>
        </section>

        {/* FEATURES */}
        <section className="relative border-t border-emerald-500/10 py-24">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="mb-14 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-emerald-400/70">
                &gt; features.list
              </p>
              <h2 className="mt-3 font-mono text-2xl text-emerald-100 sm:text-3xl md:text-4xl">
                Todo lo que necesitas. Nada de lo que sobra.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Lock className="size-5" />}
                title="Almacenamiento cifrado"
                body="Cada credencial se cifra en tu navegador con AES-256-GCM antes de tocar la red. El servidor solo ve ciphertext."
                mono="AES-256-GCM · IV único por op"
              />
              <FeatureCard
                icon={<Sparkles className="size-5" />}
                title="Generador de contraseñas"
                body="Genera passwords fuertes con crypto.getRandomValues nativo. Longitud, símbolos y verificación contra HaveIBeenPwned (k-Anonymity)."
                mono="crypto.getRandomValues"
              />
              <FeatureCard
                icon={<ShieldCheck className="size-5" />}
                title="Autenticación en 2 pasos"
                body="TOTP por app authenticator, dispositivos confiables opt-in y códigos de recuperación. Sin SMS."
                mono="TOTP · RFC 6238"
              />
              <FeatureCard
                icon={<MonitorSmartphone className="size-5" />}
                title="Sincronización entre dispositivos"
                body="Tu vault viaja cifrado. Cualquier dispositivo con tu master password lo descifra localmente."
                mono="e2ee sync"
              />
              <FeatureCard
                icon={<KeyRound className="size-5" />}
                title="Acceso rápido"
                body="Búsqueda instantánea, favoritos, categorías y tags. Autofill en un click. Todo descifrado solo en memoria."
                mono="in-memory only"
              />
              <FeatureCard
                icon={<Fingerprint className="size-5" />}
                title="Auto-bloqueo"
                body="Tras inactividad, cambio de pestaña o cierre — la master key se borra de RAM. Volver a entrar exige descifrar de nuevo."
                mono="volatile keyring"
              />
            </div>
          </div>
        </section>

        {/* PRINCIPIO ZERO-KNOWLEDGE */}
        <section className="relative border-t border-emerald-500/10 bg-black/40 py-24 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-emerald-400/70">
              &gt; principle.zero_knowledge
            </p>
            <h2 className="mt-3 font-mono text-2xl text-emerald-100 sm:text-3xl md:text-4xl">
              Si perdemos el disco, no perdemos tu vault.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-emerald-200/70">
              Tu master password nunca se envía al servidor. Ni cifrada, ni hasheada, ni fragmentada.
              Se queda en tu navegador, deriva una llave con{" "}
              <span className="font-mono text-emerald-300">PBKDF2 · SHA-256 · 600 000 iter</span>, y
              esa llave descifra tu vault en RAM.
            </p>
            <div className="mx-auto mt-8 max-w-xl rounded-lg border border-red-500/25 bg-red-950/20 p-4 text-left font-mono text-xs text-red-200/80 sm:text-sm">
              <p className="mb-2 flex items-center gap-2 text-red-300">
                <span className="text-red-400">⚠</span> warning
              </p>
              <p>
                Si olvidas tu master password, tu vault es irrecuperable.
                <br />
                Es el precio de que nadie más pueda leerlo.
              </p>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="relative border-t border-emerald-500/10 py-24">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="font-mono text-2xl text-emerald-100 sm:text-3xl md:text-4xl">
              Empieza a cifrar.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-emerald-200/60">
              Crear tu vault toma menos de un minuto. Sin tarjeta de crédito, sin telemetría, sin
              backdoors.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-md border border-emerald-400/50 bg-emerald-500/15 px-6 py-3 font-mono text-sm text-emerald-100 shadow-[0_0_40px_-10px_rgba(52,211,153,0.6)] transition-all hover:border-emerald-300 hover:bg-emerald-500/25 hover:shadow-[0_0_60px_-10px_rgba(52,211,153,0.9)]"
              >
                <span className="text-emerald-400">$</span> ./init-vault →
              </Link>
              <Link
                href="/login"
                className="font-mono text-sm text-emerald-300/70 hover:text-emerald-200"
              >
                ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>

        <footer className="relative border-t border-emerald-500/10 bg-black/60 py-8 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 font-mono text-xs text-emerald-500/50 sm:flex-row">
            <div className="flex items-center gap-2">
              <Logo className="size-4" />
              vaulthub · {new Date().getFullYear()}
            </div>
            <div>zero-knowledge by design</div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  mono,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  mono: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-emerald-500/15 bg-black/50 p-6 backdrop-blur-sm transition-all hover:border-emerald-400/40 hover:bg-black/70">
      <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
        {icon}
      </div>
      <h3 className="mb-2 font-mono text-base text-emerald-100">{title}</h3>
      <p className="text-sm text-emerald-200/60">{body}</p>
      <p className="mt-4 border-t border-emerald-500/10 pt-3 font-mono text-[10px] uppercase tracking-widest text-emerald-400/50">
        {mono}
      </p>
    </div>
  );
}
