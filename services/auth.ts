// Servicio de autenticacion. Envuelve las llamadas a Supabase Auth para
// que la UI no importe supabase directamente (regla arquitectonica en
// CLAUDE.md).
//
// IMPORTANTE: password aqui es la password de la CUENTA (Supabase Auth),
// NO la master password del vault. Nunca mezclar las dos.

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@/validators/auth";
import { logAudit } from "@/services/audit";

function getSiteOrigin(): string {
  if (typeof window === "undefined") {
    throw new Error("getSiteOrigin: solo callable desde cliente");
  }
  return window.location.origin;
}

export async function signInWithPassword(input: LoginInput): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw error;
  void logAudit("login", { method: "password" });
}

export async function signUpWithPassword(input: RegisterInput): Promise<{
  needsEmailConfirmation: boolean;
}> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${getSiteOrigin()}/auth/callback?next=/`,
    },
  });
  if (error) throw error;

  // Si el proyecto tiene "Confirm email" activo (default), user.identities
  // llega vacio hasta que confirma. Es la señal canonica de Supabase.
  const needsEmailConfirmation = !data.session;
  return { needsEmailConfirmation };
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteOrigin()}/auth/callback?next=/`,
    },
  });
  if (error) throw error;
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${getSiteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) throw error;
}

export async function updateAccountPassword(input: ResetPasswordInput): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  // Log ANTES del signOut — despues no hay sesion para insertar.
  await logAudit("logout");
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
