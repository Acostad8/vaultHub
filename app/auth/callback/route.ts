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

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function exchangeWithRetry(
  code: string,
  attempts = 3,
): Promise<{ error: Error | null; supabase: SupabaseServerClient | null }> {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        // Errores de Supabase Auth (codigo invalido, expirado, etc) NO se
        // reintentan — son deterministas.
        return { error, supabase: null };
      }
      return { error: null, supabase };
    } catch (err) {
      lastError = err;
      // TypeError/fetch failed: red inestable, reintenta.
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
      }
    }
  }
  return {
    error: lastError instanceof Error ? lastError : new Error("exchange fallo"),
    supabase: null,
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/vault";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const { error: err, supabase } = await exchangeWithRetry(code);
  if (err || !supabase) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err?.message ?? "exchange fallo")}`, request.url),
    );
  }

  // 2FA: el login por OAuth no pasa por el check del login form, asi que se
  // chequea aqui. Si la cuenta tiene TOTP y la sesion quedo en AAL1, se manda
  // a /mfa; esa pagina decide client-side el skip por dispositivo confiable
  // (el fingerprint vive en localStorage, inaccesible desde este route).
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      return NextResponse.redirect(
        new URL(`/mfa?next=${encodeURIComponent(next)}`, request.url),
      );
    }
  } catch {
    // Ante error chequeando AAL, camino conservador: pedir 2FA igualmente.
    return NextResponse.redirect(new URL(`/mfa?next=${encodeURIComponent(next)}`, request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
