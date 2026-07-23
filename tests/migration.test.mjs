import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20260723022859_initial_schema.sql", import.meta.url);
const migration = await readFile(migrationUrl, "utf8");
const hardeningMigrationUrl = new URL(
  "../supabase/migrations/20260723023052_harden_database_access.sql",
  import.meta.url,
);
const hardeningMigration = await readFile(hardeningMigrationUrl, "utf8");

test("all application tables have row level security enabled", () => {
  for (const table of ["seasons", "driver_applications", "distribution_requests", "delivery_events"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
});

test("anonymous users receive no table privileges", () => {
  for (const table of ["seasons", "driver_applications", "distribution_requests", "delivery_events"]) {
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from anon`, "i"));
  }
});

test("recipient ownership and one-request-per-season are database constraints", () => {
  assert.match(migration, /unique \(owner_id, season_id\)/i);
  assert.match(migration, /owner_id = auth\.uid\(\)/i);
  assert.match(migration, /recipients create their requests/i);
});

test("delivery claiming and status changes are database functions", () => {
  assert.match(migration, /function public\.claim_delivery/i);
  assert.match(migration, /function public\.assign_delivery/i);
  assert.match(migration, /function public\.unclaim_delivery/i);
  assert.match(migration, /function public\.set_delivery_status/i);
  assert.match(migration, /for update/i);
});

test("driver access depends on an approved application", () => {
  assert.match(migration, /function public\.is_approved_driver/i);
  assert.match(migration, /status = 'approved'/i);
  assert.match(migration, /Only approved drivers can claim deliveries/i);
});

test("database hardening removes anonymous function access", () => {
  for (const functionName of [
    "activate_season",
    "assign_delivery",
    "claim_delivery",
    "is_admin",
    "is_approved_driver",
    "set_delivery_status",
    "unclaim_delivery",
  ]) {
    assert.match(
      hardeningMigration,
      new RegExp(`revoke execute on function public\\.${functionName}\\([^;]+ from anon`, "i"),
    );
  }
});

test("database hardening optimizes policy checks and foreign keys", () => {
  assert.match(hardeningMigration, /\(select auth\.uid\(\)\)/i);
  assert.match(hardeningMigration, /\(select public\.is_admin\(\)\)/i);
  assert.match(hardeningMigration, /create index delivery_events_actor_idx/i);
  assert.match(hardeningMigration, /create index driver_applications_reviewed_by_idx/i);
});
