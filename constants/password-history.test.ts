import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PASSWORD_HISTORY_MAX_VERSIONS_PER_ITEM } from "./password-history";

describe("PASSWORD_HISTORY_MAX_VERSIONS_PER_ITEM", () => {
  it("es un entero positivo razonable", () => {
    expect(Number.isInteger(PASSWORD_HISTORY_MAX_VERSIONS_PER_ITEM)).toBe(true);
    expect(PASSWORD_HISTORY_MAX_VERSIONS_PER_ITEM).toBeGreaterThan(0);
    expect(PASSWORD_HISTORY_MAX_VERSIONS_PER_ITEM).toBeLessThanOrEqual(100);
  });

  it("coincide con versions_to_keep en la migracion SQL", () => {
    // Guard invariant: si alguien cambia la constante en TS o en el SQL sin
    // tocar el otro, este test falla.
    const sqlPath = resolve(
      __dirname,
      "..",
      "supabase",
      "migrations",
      "20260713000001_password_history_rotation.sql",
    );
    const sql = readFileSync(sqlPath, "utf8");
    const match = sql.match(/versions_to_keep\s+CONSTANT\s+INTEGER\s*:=\s*(\d+)/);
    expect(match, "versions_to_keep no encontrado en la migracion").not.toBeNull();
    const sqlValue = Number(match![1]);
    expect(sqlValue).toBe(PASSWORD_HISTORY_MAX_VERSIONS_PER_ITEM);
  });
});
