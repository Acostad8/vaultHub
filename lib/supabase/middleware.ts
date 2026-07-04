import "@/lib/undici-fix";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import { supabaseFetch } from "./fetch";

// Rutas publicas — accesibles sin sesion. Todo lo demas exige login.
const PUBLIC_ROUTES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/check-email",
]);

// Rutas donde una sesion activa nos redirige a home (evita ver login estando logueado).
const AUTH_ONLY_ROUTES = new Set(["/login", "/register", "/forgot-password"]);

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

  // Importante: getUser (no getSession) — verifica la firma del JWT contra Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Sin sesion + ruta protegida -> login
  if (!user && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Con sesion + ruta auth-only -> home
  if (user && AUTH_ONLY_ROUTES.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
