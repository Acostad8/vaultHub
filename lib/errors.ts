// Extractor defensivo de mensaje de error. Los SDKs de Supabase mezclan
// Error, AuthApiError, PostgrestError y objetos planos. Intento leer un
// campo de mensaje utilizable en cualquier caso, sin filtrar payloads
// sensibles ni renderizar `{}` en la UI.

export function errorMessage(err: unknown, fallback = "Error inesperado"): string {
  if (err == null) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "object") {
    const obj = err as {
      message?: unknown;
      error_description?: unknown;
      msg?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (typeof obj.error_description === "string" && obj.error_description)
      return obj.error_description;
    if (typeof obj.msg === "string" && obj.msg) return obj.msg;
    if (typeof obj.details === "string" && obj.details) return obj.details;
    if (typeof obj.hint === "string" && obj.hint) return obj.hint;
  }
  return fallback;
}
