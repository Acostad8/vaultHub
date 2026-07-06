// Custom fetch para pasar a los clientes Supabase.
// Fuerza el uso de undici.Agent con autoSelectFamily (RFC 8305) para
// esquivar el bug de conectividad de Node en Windows dev.
//
// En Edge runtime no hay `undici` importable — devolvemos globalThis.fetch
// sin tocar.

type UndiciModule = typeof import("undici");
type UndiciFetch = (i: unknown, o?: unknown) => Promise<Response>;

interface UndiciBundle {
  fetch: UndiciFetch;
  dispatcher: unknown;
}

let bundlePromise: Promise<UndiciBundle | null> | null = null;

function loadUndiciBundle(): Promise<UndiciBundle | null> {
  if (bundlePromise) return bundlePromise;
  bundlePromise = (async () => {
    try {
      const undici: UndiciModule = await import("undici");
      const dispatcher = new undici.Agent({
        connect: {
          autoSelectFamily: true,
          autoSelectFamilyAttemptTimeout: 500,
          timeout: 30_000,
        },
        connectTimeout: 30_000,
      });
      return { fetch: undici.fetch as unknown as UndiciFetch, dispatcher };
    } catch {
      return null;
    }
  })();
  return bundlePromise;
}

export const supabaseFetch: typeof fetch = async (input, init) => {
  const bundle = await loadUndiciBundle();
  if (!bundle) return fetch(input, init);
  return bundle.fetch(input, { ...(init ?? {}), dispatcher: bundle.dispatcher });
};
