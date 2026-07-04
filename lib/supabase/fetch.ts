// Custom fetch para pasar a los clientes Supabase.
// Fuerza el uso de undici.Agent con autoSelectFamily (RFC 8305) para
// esquivar el bug de conectividad de Node en Windows dev.
//
// En Edge runtime no hay `undici` importable — devolvemos globalThis.fetch
// sin tocar.

let cachedDispatcher: unknown = null;

async function getDispatcher() {
  if (cachedDispatcher !== null) return cachedDispatcher;
  try {
    const undici = await import("undici");
    cachedDispatcher = new undici.Agent({
      connect: {
        autoSelectFamily: true,
        autoSelectFamilyAttemptTimeout: 500,
        timeout: 30_000,
      },
      connectTimeout: 30_000,
    });
  } catch {
    cachedDispatcher = false; // marker: no disponible
  }
  return cachedDispatcher;
}

// Fetch WHATWG-compatible. Los clientes Supabase pasan args standard.
export const supabaseFetch: typeof fetch = async (input, init) => {
  const dispatcher = await getDispatcher();
  if (!dispatcher) {
    return fetch(input, init);
  }
  const undici = await import("undici");
  // undici.fetch acepta la opcion no-standard `dispatcher`; ambos tipos
  // (undici vs lib.dom) difieren en detalles pero comparten shape runtime.
  // Cast puntual para el mismatch de body (ReadableStream) entre tipos.
  const undiciFetch = undici.fetch as unknown as (
    i: unknown,
    o?: unknown,
  ) => Promise<Response>;
  return undiciFetch(input, { ...(init ?? {}), dispatcher });
};
