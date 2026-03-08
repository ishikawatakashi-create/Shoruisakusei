import test from "node:test";
import assert from "node:assert/strict";
import { buildDocumentNumber, resolveNextSequence } from "../../lib/numbering";

test("buildDocumentNumber pads the sequence with the configured digits", () => {
  assert.equal(buildDocumentNumber("INV", 2026, 12, 4), "INV-2026-0012");
});

test("resolveNextSequence increments within the same year", () => {
  const next = resolveNextSequence(
    {
      prefix: "INV",
      digits: 4,
      currentYear: 2026,
      currentSeq: 12,
      yearReset: true,
    },
    2026
  );

  assert.deepEqual(next, {
    year: 2026,
    sequence: 13,
    prefix: "INV",
    digits: 4,
    previousYear: 2026,
    previousSequence: 12,
  });
});

test("resolveNextSequence resets when the year changes and yearReset is enabled", () => {
  const next = resolveNextSequence(
    {
      prefix: "EST",
      digits: 3,
      currentYear: 2025,
      currentSeq: 99,
      yearReset: true,
    },
    2026
  );

  assert.deepEqual(next, {
    year: 2026,
    sequence: 1,
    prefix: "EST",
    digits: 3,
    previousYear: 2025,
    previousSequence: 99,
  });
});

test("resolveNextSequence keeps incrementing across years when yearReset is disabled", () => {
  const next = resolveNextSequence(
    {
      prefix: "REC",
      digits: 4,
      currentYear: 2025,
      currentSeq: 20,
      yearReset: false,
    },
    2026
  );

  assert.equal(next.sequence, 21);
  assert.equal(next.year, 2026);
});
