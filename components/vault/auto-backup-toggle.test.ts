import { describe, it, expect } from "vitest";

import { backupIsOverdue } from "./backup-schedule";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-07-13T12:00:00Z").getTime();

describe("backupIsOverdue", () => {
  it("off (days=0) nunca esta vencido", () => {
    expect(backupIsOverdue(0, null, NOW)).toBe(false);
    expect(backupIsOverdue(0, new Date(NOW - 10 * DAY).toISOString(), NOW)).toBe(false);
  });

  it("sin last_backup_at, cualquier days>0 esta vencido", () => {
    expect(backupIsOverdue(1, null, NOW)).toBe(true);
    expect(backupIsOverdue(30, null, NOW)).toBe(true);
  });

  it("last_backup dentro del intervalo NO esta vencido", () => {
    expect(backupIsOverdue(7, new Date(NOW - 3 * DAY).toISOString(), NOW)).toBe(false);
  });

  it("last_backup pasado el intervalo esta vencido", () => {
    expect(backupIsOverdue(7, new Date(NOW - 8 * DAY).toISOString(), NOW)).toBe(true);
  });

  it("borderline exacto (=days) esta vencido — recordatorio conservador", () => {
    expect(backupIsOverdue(7, new Date(NOW - 7 * DAY).toISOString(), NOW)).toBe(true);
  });

  it("last_backup invalido (fecha malformed) => vencido", () => {
    expect(backupIsOverdue(1, "not-a-date", NOW)).toBe(true);
  });
});
