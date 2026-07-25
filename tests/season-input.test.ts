import assert from "node:assert/strict";
import test from "node:test";
import { parseSeasonInput, seasonDateRange } from "../src/lib/season-input.ts";

function makeFormData(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

test("season activation requires valid dates and explicit confirmation", () => {
  const valid = parseSeasonInput(
    makeFormData({
      confirmActivation: "yes",
      endsOn: "2027-03-09",
      name: "Ramadan 2027",
      startsOn: "2027-02-08",
    }),
  );
  const reversed = parseSeasonInput(
    makeFormData({
      confirmActivation: "yes",
      endsOn: "2027-02-01",
      name: "Ramadan 2027",
      startsOn: "2027-02-08",
    }),
  );
  const unconfirmed = parseSeasonInput(
    makeFormData({ endsOn: "2027-03-09", name: "Ramadan 2027", startsOn: "2027-02-08" }),
  );

  assert.equal(valid.ok, true);
  assert.deepEqual(reversed, { error: "Season end date must be after its start date.", ok: false });
  assert.deepEqual(unconfirmed, { error: "Confirm that you want to archive the current season.", ok: false });
});

test("active season dates have a readable range", () => {
  assert.equal(
    seasonDateRange({
      endsOn: "2026-03-19",
      id: "season-2026",
      isActive: true,
      name: "Ramadan 2026",
      startsOn: "2026-02-18",
    }),
    "Feb 18, 2026 - Mar 19, 2026",
  );
});
