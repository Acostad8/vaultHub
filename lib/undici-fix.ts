// Fix undici para Windows dev (Node 24). Ver instrumentation.ts para el
// diagnostico. Este modulo se ejecuta en TIEMPO DE IMPORTACION y aplica
// el dispatcher global. Se importa desde el env.ts de supabase para que
// cualquier ruta que instancie un cliente Supabase pase por aqui — incluye
// el proxy de Next 16, que instrumentation.ts no siempre alcanza en dev.
//
// Idempotente: multiples imports solo instalan el dispatcher una vez.

declare global {
  var __undiciFixApplied: boolean | undefined;
}

if (typeof process !== "undefined" && process.versions?.node && !globalThis.__undiciFixApplied) {
  globalThis.__undiciFixApplied = true;
  try {
    // dns pref ipv4-first como refuerzo.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = require("node:dns") as typeof import("node:dns");
    dns.setDefaultResultOrder("ipv4first");

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const undici = require("undici") as typeof import("undici");
    const agent = new undici.Agent({
      connect: {
        autoSelectFamily: true,
        autoSelectFamilyAttemptTimeout: 500,
        timeout: 30_000,
      },
      connectTimeout: 30_000,
    });
    undici.setGlobalDispatcher(agent);
  } catch {
    // Edge runtime / entornos sin node:dns o undici: no aplica, ignorar.
  }
}

export {};
