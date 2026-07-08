// Logo de VaultHub (hexagono + llave). Misma marca que app/icon.svg.
// Variantes alternativas guardadas en logo-options.html (raiz del repo).
export function Logo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="vh-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <path d="M32 4 L55 17 V47 L32 60 L9 47 V17 Z" fill="url(#vh-logo-g)" />
      <circle cx="32" cy="25" r="8" fill="none" stroke="#fff" strokeWidth="4.5" />
      <line x1="32" y1="33" x2="32" y2="50" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="32" y1="43" x2="39" y2="43" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="32" y1="50" x2="38" y2="50" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}
