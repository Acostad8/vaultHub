import type { NextConfig } from "next";

// Headers de seguridad globales. Aplican a TODAS las rutas.
// - HSTS: fuerza HTTPS en subdominios de por vida (a activar solo tras
//   verificar dominio en prod; en Vercel preview los subdominios *.vercel.app
//   ya son HTTPS por default).
// - X-Frame-Options: bloquea iframe embedding (defensa contra clickjacking).
// - X-Content-Type-Options: nosniff evita mime confusion.
// - Referrer-Policy: no filtrar la URL exacta a terceros (solo origin).
// - Permissions-Policy: negamos APIs sensibles que no usamos.
// - Content-Security-Policy: whitelist estrictamente lo que usamos:
//     script-self, style-self+inline (Tailwind runtime), connect a Supabase +
//     HIBP, sin frames, sin object.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co";
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_URL} https://api.pwnedpasswords.com`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
