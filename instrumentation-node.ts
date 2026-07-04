// Solo para Node runtime. Turbopack no bundlea este modulo bajo Edge
// porque el import es dinamico y condicional en instrumentation.ts.

export async function registerNode() {
  const dns = await import("node:dns");
  dns.setDefaultResultOrder("ipv4first");

  const undici = await import("undici");
  const agent = new undici.Agent({
    connect: {
      autoSelectFamily: true,
      autoSelectFamilyAttemptTimeout: 500,
      timeout: 30_000,
    },
    connectTimeout: 30_000,
  });
  undici.setGlobalDispatcher(agent);
}
