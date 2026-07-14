// Logo de VaultHub: huella dactilar entre brackets [ ]. Une la idea de
// autenticacion biometrica con el look terminal del producto. Usa currentColor
// para que el color venga del texto del contenedor.
// La huella es asimetrica y con ridge breaks / core swirl para no verse
// generica; ver icon-options.html para variantes.
export function Logo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      {/* Brackets externos [ ] */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 8 L7 8 L7 56 L13 56" />
        <path d="M51 8 L57 8 L57 56 L51 56" />
      </g>

      {/* Huella: 5 ridges con ruptures asimetricos + core swirl */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Ridge externo (partido a la derecha: mimica un ridge ending) */}
        <path d="M14 44 Q14 14 32 14 Q45 14 49 26" />
        <path d="M50 34 Q50 43 48 49" />

        {/* Ridge 2 completo */}
        <path d="M18 47 Q18 18 32 18 Q45 18 45 44" />

        {/* Ridge 3 con break del lado izquierdo (otro ridge ending) */}
        <path d="M22 30 Q25 22 32 22 Q41 22 41 40" />
        <path d="M41 44 L41 48" />

        {/* Ridge 4 (interior) */}
        <path d="M26 46 Q26 26 32 26 Q37 26 37 44" />

        {/* Core swirl: no es un arco perfecto, sale con un pequeno gancho */}
        <path d="M30 40 Q28 32 33 32 Q36 34 33 38" />
      </g>

      {/* Ridge ending dots (sutiles) para dar textura biometrica */}
      <g fill="currentColor">
        <circle cx="20" cy="36" r="0.9" />
        <circle cx="44" cy="34" r="0.9" />
      </g>
    </svg>
  );
}
