import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Carga .env.e2e (gitignored) sin depender de dotenv.
const envFile = path.resolve(__dirname, ".env.e2e");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  }
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Un solo worker: los tests comparten el mismo usuario/vault de prueba.
  workers: 1,
  timeout: 90_000,
  retries: 0,
  reporter: [["list"]],
  // Puerto 3001: 3000 suele estar ocupado por otro dev server local, y el
  // dev server habitual de VaultHub ya corre en 3001 (se reutiliza si existe).
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 3001",
    url: "http://localhost:3001/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
