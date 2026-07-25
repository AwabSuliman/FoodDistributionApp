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
const adminUnclaimMigrationUrl = new URL(
  "../supabase/migrations/20260724000100_allow_admin_unclaim.sql",
  import.meta.url,
);
const adminUnclaimMigration = await readFile(adminUnclaimMigrationUrl, "utf8");
const trustedRolesMigrationUrl = new URL(
  "../supabase/migrations/20260724000300_enforce_trusted_signup_roles.sql",
  import.meta.url,
);
const trustedRolesMigration = await readFile(trustedRolesMigrationUrl, "utf8");
const failedDeliveryMigrationUrl = new URL(
  "../supabase/migrations/20260724000400_record_failed_delivery_reasons.sql",
  import.meta.url,
);
const failedDeliveryMigration = await readFile(failedDeliveryMigrationUrl, "utf8");
const realtimeMigrationUrl = new URL(
  "../supabase/migrations/20260724000500_enable_dashboard_realtime.sql",
  import.meta.url,
);
const realtimeMigration = await readFile(realtimeMigrationUrl, "utf8");
const recipientEditsMigrationUrl = new URL(
  "../supabase/migrations/20260725000100_allow_recipient_request_edits.sql",
  import.meta.url,
);
const recipientEditsMigration = await readFile(recipientEditsMigrationUrl, "utf8");
const requestAuditMigrationUrl = new URL(
  "../supabase/migrations/20260725000200_audit_request_lifecycle.sql",
  import.meta.url,
);
const requestAuditMigration = await readFile(requestAuditMigrationUrl, "utf8");
const requestIntakeMigrationUrl = new URL(
  "../supabase/migrations/20260725000300_manage_request_intake.sql",
  import.meta.url,
);
const requestIntakeMigration = await readFile(requestIntakeMigrationUrl, "utf8");
const bulkActionsMigrationUrl = new URL(
  "../supabase/migrations/20260725000400_add_bulk_request_actions.sql",
  import.meta.url,
);
const bulkActionsMigration = await readFile(bulkActionsMigrationUrl, "utf8");
const bulkDriverApprovalMigrationUrl = new URL(
  "../supabase/migrations/20260725000500_add_bulk_driver_approval.sql",
  import.meta.url,
);
const bulkDriverApprovalMigration = await readFile(bulkDriverApprovalMigrationUrl, "utf8");

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

test("admins can release an active driver assignment", () => {
  assert.match(adminUnclaimMigration, /assigned_driver_id = auth\.uid\(\) or public\.is_admin\(\)/i);
  assert.match(adminUnclaimMigration, /set assigned_driver_id = null, status = 'approved'/i);
  assert.match(adminUnclaimMigration, /assigned driver or an admin can unclaim/i);
});

test("signup roles are trusted and enforced by database policies", () => {
  assert.match(trustedRolesMigration, /before insert on auth\.users/i);
  assert.match(trustedRolesMigration, /jsonb_build_object\('role', signup_role\)/i);
  assert.match(trustedRolesMigration, /app_metadata' ->> 'role'\) = 'driver'/i);
  assert.match(trustedRolesMigration, /app_metadata' ->> 'role'\) = 'recipient'/i);
  assert.match(trustedRolesMigration, /drop policy "recipients create their requests"/i);
  assert.match(trustedRolesMigration, /drop policy "users create their driver application"/i);
});

test("failed deliveries require and store a reason", () => {
  assert.match(failedDeliveryMigration, /status_note text default null/i);
  assert.match(failedDeliveryMigration, /next_status = 'not_delivered'.+length\(trim\(status_note\)\) < 5/is);
  assert.match(failedDeliveryMigration, /case when next_status = 'not_delivered' then trim\(status_note\)/i);
  assert.match(
    failedDeliveryMigration,
    /grant execute on function public\.set_delivery_status\(uuid, public\.request_status, text\) to authenticated/i,
  );
});

test("dashboard tables are added to the realtime publication safely", () => {
  for (const table of ["delivery_events", "distribution_requests", "driver_applications", "seasons"]) {
    assert.match(realtimeMigration, new RegExp(`'${table}'`, "i"));
  }

  assert.match(realtimeMigration, /pubname = 'supabase_realtime'/i);
  assert.match(realtimeMigration, /if not exists/i);
  assert.match(realtimeMigration, /alter publication supabase_realtime add table/i);
});

test("recipients can edit only their own pre-approval requests", () => {
  assert.match(recipientEditsMigration, /current_request\.owner_id <> auth\.uid\(\)/i);
  assert.match(recipientEditsMigration, /app_metadata' ->> 'role'\) = 'recipient'/i);
  assert.match(recipientEditsMigration, /status not in \('submitted', 'under_review'\)/i);
  assert.match(recipientEditsMigration, /else new_household_size \* 7/i);
  assert.match(
    recipientEditsMigration,
    /grant execute on function public\.update_request_details\([^)]+\) to authenticated/i,
  );
});

test("request submissions, review decisions, and edits are audited", () => {
  assert.match(requestAuditMigration, /after insert or update on public\.distribution_requests/i);
  assert.match(requestAuditMigration, /'request_submitted'/i);
  assert.match(requestAuditMigration, /'request_status_changed'/i);
  assert.match(requestAuditMigration, /'request_edited'/i);
  assert.match(requestAuditMigration, /old\.status = 'submitted' and new\.status = 'under_review'/i);
  assert.match(requestAuditMigration, /old\.status = 'under_review' and new\.status in \('approved', 'denied'\)/i);
  assert.match(
    requestAuditMigration,
    /revoke all on function public\.audit_distribution_request\(\) from public, anon, authenticated/i,
  );
});

test("admins can open and close request intake", () => {
  assert.match(requestIntakeMigration, /add column accepting_requests boolean not null default true/i);
  assert.match(requestIntakeMigration, /if not public\.is_admin\(\)/i);
  assert.match(requestIntakeMigration, /where is_active/i);
  assert.match(requestIntakeMigration, /grant execute on function public\.set_request_intake\(boolean\) to authenticated/i);
});

test("bulk request actions are admin-only and transaction-safe", () => {
  assert.match(bulkActionsMigration, /function public\.bulk_set_request_status/i);
  assert.match(bulkActionsMigration, /function public\.bulk_assign_deliveries/i);
  assert.match(bulkActionsMigration, /if not public\.is_admin\(\)/i);
  assert.match(bulkActionsMigration, /for update/i);
  assert.match(bulkActionsMigration, /cardinality\(target_request_ids\) > 200/i);
  assert.match(bulkActionsMigration, /from public\.assign_delivery\(request_id, target_driver_id\)/i);
  assert.match(
    bulkActionsMigration,
    /grant execute on function public\.bulk_set_request_status\(uuid\[\], public\.request_status\) to authenticated/i,
  );
  assert.match(
    bulkActionsMigration,
    /grant execute on function public\.bulk_assign_deliveries\(uuid\[\], uuid\) to authenticated/i,
  );
});

test("bulk driver approval is admin-only and locks every application", () => {
  assert.match(bulkDriverApprovalMigration, /function public\.bulk_approve_driver_applications/i);
  assert.match(bulkDriverApprovalMigration, /if not public\.is_admin\(\)/i);
  assert.match(bulkDriverApprovalMigration, /application\.status <> 'pending'/i);
  assert.match(bulkDriverApprovalMigration, /for update/i);
  assert.match(bulkDriverApprovalMigration, /reviewed_by = auth\.uid\(\)/i);
  assert.match(
    bulkDriverApprovalMigration,
    /grant execute on function public\.bulk_approve_driver_applications\(uuid\[\]\) to authenticated/i,
  );
});
