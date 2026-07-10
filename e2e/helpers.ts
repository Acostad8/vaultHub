import { type Page } from "@playwright/test";

export const EMAIL = process.env.E2E_EMAIL ?? "";
export const PASSWORD = process.env.E2E_PASSWORD ?? "";
export const MASTER_PASSWORD = process.env.E2E_MASTER_PASSWORD ?? "";

export function assertEnv() {
  if (!EMAIL || !PASSWORD || !MASTER_PASSWORD) {
    throw new Error(
      "Faltan E2E_EMAIL / E2E_PASSWORD / E2E_MASTER_PASSWORD. Crea .env.e2e (ver README).",
    );
  }
}

export async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

// El vault del usuario e2e se inicializa la primera vez que corren los tests
// (setup-vault); en corridas posteriores solo se desbloquea (unlock).
export async function unlockVault(page: Page) {
  await page.goto("/");
  await page.waitForURL(/\/(setup-vault|unlock)/, { timeout: 30_000 });

  if (page.url().includes("setup-vault")) {
    await page.fill("#masterPassword", MASTER_PASSWORD);
    await page.fill("#confirmPassword", MASTER_PASSWORD);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Crear vault" }).click();
  } else {
    await page.fill("#masterPassword", MASTER_PASSWORD);
    await page.getByRole("button", { name: "Desbloquear" }).click();
  }

  // PBKDF2 con 600k iteraciones tarda unos segundos en derivar la clave.
  await page.waitForURL((url) => url.pathname === "/", { timeout: 60_000 });
  // El unlock dispara router.refresh(); si navegamos antes de que termine,
  // el refresh pendiente de "/" puede pisar la navegacion a otra ruta.
  await page.waitForLoadState("networkidle");
}
