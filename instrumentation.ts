// Instrumentation de Next.js. Corre una vez al arrancar cada runtime.
// El fix real (undici + dns) esta en instrumentation-node.ts para que
// Turbopack NO lo bundle bajo Edge (evita warning "node module in Edge Runtime").

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
}
