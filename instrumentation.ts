// Instrumentation de Next.js. Corre una vez al arrancar el runtime Node.
//
// Fix critico para Windows dev (Node 24 + undici 6):
//   El fetch nativo de Node (undici) al conectar a hosts detras de
//   Cloudflare — como Supabase — a veces cae con
//     UND_ERR_CONNECT_TIMEOUT (10s)
//   aunque https.get de Node core y curl del sistema conectan sin
//   problema (probable interaccion undici<->Windows TCP/TLS stack).
//   Sintoma reproducible en este proyecto: /auth/callback tira
//   "fetch failed" al llamar exchangeCodeForSession.
//
//   Fix: instalar un Agent global de undici con autoSelectFamily
//   (RFC 8305 Happy Eyeballs — intenta IPv4 e IPv6 en paralelo y toma
//   el primero que responda) y timeout de connect mas amplio.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

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
