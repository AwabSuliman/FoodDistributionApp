import assert from "node:assert/strict";
import test from "node:test";
import {
  requestCsvFilename,
  requestsToCsv,
  routeManifestFilename,
  routeManifestToCsv,
} from "../src/lib/request-csv.ts";
import type { DistributionRequest } from "../src/lib/types.ts";

const request: DistributionRequest = {
  address: '12 "Garden" Road',
  boxWeight: "28 lb",
  email: "amina@example.org",
  householdSize: 4,
  id: "MWI-101",
  instructions: "Call on arrival, use side entrance",
  phone: "(555) 010-2000",
  recipient: "Amina Yusuf",
  status: "Approved",
  updated: "Just now",
};

test("request CSV exports operational fields and escapes punctuation", () => {
  const csv = requestsToCsv([request]);

  assert.match(csv, /"Request","Recipient","Email","Phone","Address"/);
  assert.match(csv, /"12 ""Garden"" Road"/);
  assert.match(csv, /"Call on arrival, use side entrance"/);
  assert.match(csv, /"Unassigned"/);
  assert.equal(csv.split("\r\n").length, 2);
});

test("request CSV neutralizes spreadsheet formulas in user-entered fields", () => {
  const csv = requestsToCsv([{ ...request, recipient: "=HYPERLINK(\"https://example.org\")" }]);

  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.org""\)"/);
});

test("request CSV filenames are stable and filesystem-safe", () => {
  assert.equal(requestCsvFilename("Ramadan 2027"), "distribution-requests-ramadan-2027.csv");
  assert.equal(requestCsvFilename("  "), "distribution-requests-active-season.csv");
});

test("driver route manifests contain delivery fields without recipient email", () => {
  const csv = routeManifestToCsv([request]);

  assert.match(csv, /"Request","Recipient","Phone","Address"/);
  assert.match(csv, /"Delivery instructions","Status"/);
  assert.doesNotMatch(csv, /"Email"/);
  assert.doesNotMatch(csv, /amina@example\.org/);
  assert.equal(routeManifestFilename("Omar Hassan"), "delivery-route-omar-hassan.csv");
});
