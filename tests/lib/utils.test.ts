import test from "node:test";
import assert from "node:assert/strict";
import { formatDate, fromStoredDate, isDateOnly, parseDateOnly, todayDateOnly, toStoredDate } from "../../lib/utils";

test("parseDateOnly and fromStoredDate keep date-only values stable in UTC", () => {
  const parsed = parseDateOnly("2026-03-08");

  assert.equal(parsed.toISOString(), "2026-03-08T00:00:00.000Z");
  assert.equal(fromStoredDate(parsed), "2026-03-08");
});

test("toStoredDate returns null for empty values and a UTC date for date-only strings", () => {
  assert.equal(toStoredDate(undefined), null);
  assert.equal(toStoredDate(null), null);
  assert.equal(toStoredDate("2026-03-08")?.toISOString(), "2026-03-08T00:00:00.000Z");
});

test("formatDate treats date-only strings as UTC dates", () => {
  assert.equal(formatDate("2026-03-08"), "2026/03/08");
});

test("isDateOnly and todayDateOnly work with plain calendar dates", () => {
  assert.equal(isDateOnly("2026-03-08"), true);
  assert.equal(isDateOnly("2026-3-8"), false);
  assert.equal(todayDateOnly(new Date(2026, 2, 8, 23, 59, 59)), "2026-03-08");
});
