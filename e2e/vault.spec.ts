import { expect, test } from "@playwright/test";

import { assertEnv, login, unlockVault } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  assertEnv();
});

test("login con email/password entra al area protegida", async ({ page }) => {
  await login(page);
  await expect(page).not.toHaveURL(/\/login/);
  // Sin master password el vault sigue bloqueado: gate manda a unlock/setup.
  await page.goto("/");
  await page.waitForURL(/\/(setup-vault|unlock)/);
});

test("login con password incorrecta muestra error y no entra", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", process.env.E2E_EMAIL ?? "");
  await page.fill("#password", "password-incorrecta-123");
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page.locator("form")).toContainText(/credenciales|inv[aá]lid|incorrect/i, {
    timeout: 15_000,
  });
  await expect(page).toHaveURL(/\/login/);
});

test("desbloqueo del vault con master password", async ({ page }) => {
  await login(page);
  await unlockVault(page);
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Tu vault" })).toBeVisible();
});

test("crear credencial y verla en la lista", async ({ page }) => {
  await login(page);
  await unlockVault(page);

  const itemName = `E2E Test ${Date.now()}`;
  // Navegacion client-side: un goto() recarga y borra la master key (Zustand
  // en memoria), lo que manda de vuelta a /unlock. El click se reintenta
  // porque el router.refresh() posterior al unlock puede tragarse el primero.
  await expect(async () => {
    await page.getByRole("link", { name: "Nuevo item" }).click();
    await page.waitForURL(/\/vault\/new/, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await page.fill("#name", itemName);
  await page.fill("#url", "https://example.com");
  await page.fill("#username", "e2e-user");
  await page.fill("#password", "S3cret-e2e-password!");
  // El boton "Crear" se re-monta con cada re-render del form (watch de RHF),
  // y el click de Playwright falla con "element detached"; Enter en un input
  // dispara el mismo submit del form de forma estable.
  await page.press("#password", "Enter");

  await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
  // El nombre viaja cifrado al servidor y se descifra en memoria al listar.
  await expect(page.getByText(itemName)).toBeVisible({ timeout: 15_000 });
});
