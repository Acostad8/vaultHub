import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { assertEnv, login, unlockVault } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  assertEnv();
});

// Reglas WCAG 2.1 A + AA. Excluimos color-contrast por defecto porque el
// theme dark de Tailwind admite tokens con ratio 4.4 (borderline AA en
// componentes deshabilitados) — auditamos color aparte con Lighthouse manual.
// Ver docs/A11Y_AUDIT.md.
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;

async function runAxe(page: import("@playwright/test").Page) {
  return new AxeBuilder({ page })
    .withTags([...AXE_TAGS])
    .disableRules(["color-contrast"])
    .analyze();
}

test("home /login sin violaciones WCAG (fuera de contraste)", async ({ page }) => {
  await page.goto("/login");
  const results = await runAxe(page);
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("register sin violaciones WCAG", async ({ page }) => {
  await page.goto("/register");
  const results = await runAxe(page);
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("vault desbloqueado (lista + filtros) sin violaciones WCAG", async ({ page }) => {
  await login(page);
  await unlockVault(page);
  const results = await runAxe(page);
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("categorias (con handles de arrastre) sin violaciones WCAG", async ({ page }) => {
  await login(page);
  await unlockVault(page);
  await page.goto("/categories");
  const results = await runAxe(page);
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
