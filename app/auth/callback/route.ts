// Callback de OAuth y confirmacion de email. Supabase redirige aqui con
// ?code=... (PKCE). Cambiamos el code por sesion server-side y redirigimos
// al `next` param (o home).
//
// Nota sobre `fetch failed` en Node dev (Windows): la primera request de
// Node a Supabase a veces falla por resolucion IPv6 sin conectividad.
// Reintentamos hasta 3 veces con backoff corto — el segundo intento
// suele resolverse via IPv4.

import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function exchangeWithRetry(code: string, attempts = 3): Promise<Error | null> {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        lastError = error;
        // Errores de Supabase Auth (codigo invalido, expirado, etc) NO se
        // reintentan — son deterministas.
        return error;
      }
      return null;
    } catch (err) {
      lastError = err;
      // TypeError/fetch failed: red inestable, reintenta.
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
      }
    }
  }
  return lastError instanceof Error ? lastError : new Error("exchange fallo");
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const err = await exchangeWithRetry(code);
  if (err) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message)}`, request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
