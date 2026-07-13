import "@/lib/undici-fix";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import { supabaseFetch } from "./fetch";

// Rutas publicas — accesibles sin sesion. Todo lo demas exige login.
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/check-email",
]);

// Rutas donde una sesion activa nos redirige al vault (evita ver landing/login estando logueado).
const AUTH_ONLY_ROUTES = new Set(["/", "/login", "/register", "/forgot-password"]);

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  // /auth/callback debe ser publica siempre (Supabase redirige aqui sin sesion en algunos flows).
  if (pathname.startsWith("/auth/")) return true;
  return false;
}

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
    global: { fetch: supabaseFetch },
  });

  // getClaims verifica la firma del JWT localmente contra el JWKS de Supabase
  // (cacheado en memoria del proceso). Cero HTTP roundtrip por request — a
  // diferencia de getUser(), que golpea /auth/v1/user en cada navegacion.
  // Si el proyecto usa firmas simetricas (HS256), la libreria hace fallback
  // seguro al modo remoto. Fuente: docs supabase-js `getClaims()`.
  const {
    data: claimsData,
  } = await supabase.auth.getClaims();
  const user = claimsData?.claims ?? null;

  const pathname = request.nextUrl.pathname;

  // Sin sesion + ruta protegida -> login
  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Con sesion + ruta auth-only -> vault
  if (user && AUTH_ONLY_ROUTES.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/vault";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
