import "server-only";

import type { AuthProfile } from "./auth";
import { createSupabaseServerClient } from "./auth";
import type {
  DashboardData,
  DeliveryActivity,
  DistributionRequest,
  DriverApplicationDecision,
  DriverApplicationInput,
  DriverApplicationStatus,
  FamilySizeRow,
  PendingDriver,
  RequestStatus,
  RequestEditInput,
  SeasonInput,
  Season,
} from "./types";
import { PublicError } from "./errors";
import { makeDeliveryActivity } from "./delivery-activity";

type RequestInput = {
  address: string;
  email: string;
  householdSize: number;
  instructions: string;
  phone: string;
  recipient: string;
};

type RequestRow = {
  address: string;
  assigned_driver_id: string | null;
  box_weight_lbs: number;
  created_at: string;
  email: string;
  household_size: number;
  id: string;
  instructions: string;
  owner_id: string;
  phone: string;
  recipient_name: string;
  request_number: number;
  season_id: string;
  status: DatabaseRequestStatus;
  updated_at: string;
};

type DriverRow = {
  email: string;
  name: string;
  phone: string;
  status: DriverApplicationStatus;
  user_id: string;
};

type SeasonRow = {
  ends_on: string | null;
  id: string;
  is_active: boolean;
  name: string;
  starts_on: string | null;
};

type DeliveryEventRow = {
  actor_id: string | null;
  created_at: string;
  event_type: string;
  from_status: DatabaseRequestStatus | null;
  id: number;
  notes: string | null;
  request_id: string;
  to_status: DatabaseRequestStatus | null;
};

type DatabaseRequestStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "driver_assigned"
  | "heading_to_pickup"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "not_delivered"
  | "denied";

const toDatabaseStatus: Record<RequestStatus, DatabaseRequestStatus> = {
  Submitted: "submitted",
  "Under review": "under_review",
  Approved: "approved",
  "Driver assigned": "driver_assigned",
  "Heading to pickup": "heading_to_pickup",
  "Picked up": "picked_up",
  "Out for delivery": "out_for_delivery",
  Delivered: "delivered",
  "Not delivered": "not_delivered",
  Denied: "denied",
};

const fromDatabaseStatus: Record<DatabaseRequestStatus, RequestStatus> = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  driver_assigned: "Driver assigned",
  heading_to_pickup: "Heading to pickup",
  picked_up: "Picked up",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  not_delivered: "Not delivered",
  denied: "Denied",
};

const activeStatuses: RequestStatus[] = [
  "Approved",
  "Driver assigned",
  "Heading to pickup",
  "Picked up",
  "Out for delivery",
  "Delivered",
  "Not delivered",
];

function throwDatabaseError(
  error: { code?: string; message: string } | null,
  fallback: string,
  duplicateMessage = fallback,
): never | void {
  if (!error) return;

  if (error.code === "23505") {
    throw new PublicError(duplicateMessage);
  }

  throw new PublicError(fallback);
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));

  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;

  const hours = Math.round(elapsedMinutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function toDriver(row: DriverRow): PendingDriver {
  return { email: row.email, name: row.name, phone: row.phone, userId: row.user_id };
}

function toSeason(row: SeasonRow): Season {
  return {
    endsOn: row.ends_on ?? undefined,
    id: row.id,
    isActive: row.is_active,
    name: row.name,
    startsOn: row.starts_on ?? undefined,
  };
}

function toRequest(
  row: RequestRow,
  driverNames: Map<string, string>,
  activitiesByRequest: Map<string, DeliveryActivity[]>,
): DistributionRequest {
  return {
    address: row.address,
    boxWeight: `${row.box_weight_lbs} lb`,
    deliveryActivity: activitiesByRequest.get(row.id) ?? [],
    driver: row.assigned_driver_id ? driverNames.get(row.assigned_driver_id) : undefined,
    email: row.email,
    householdSize: row.household_size,
    id: `MWI-${row.request_number}`,
    instructions: row.instructions,
    phone: row.phone,
    recipient: row.recipient_name,
    recordId: row.id,
    status: fromDatabaseStatus[row.status],
    updated: relativeTime(row.updated_at),
  };
}

function groupDeliveryActivity(rows: DeliveryEventRow[], driverNames: Map<string, string>) {
  const activities = new Map<string, DeliveryActivity[]>();

  rows.forEach((row) => {
    const activity = makeDeliveryActivity({
      actorName: row.actor_id ? driverNames.get(row.actor_id) : undefined,
      assignedDriverName: row.event_type === "assigned" && row.notes ? driverNames.get(row.notes) : undefined,
      eventType: row.event_type,
      fromStatus: row.from_status ? fromDatabaseStatus[row.from_status] : undefined,
      id: String(row.id),
      occurred: relativeTime(row.created_at),
      toStatus: row.to_status ? fromDatabaseStatus[row.to_status] : undefined,
    });
    const requestActivities = activities.get(row.request_id) ?? [];
    requestActivities.push(activity);
    activities.set(row.request_id, requestActivities);
  });

  return activities;
}

function familyGroupForSize(householdSize: number) {
  if (householdSize <= 2) return "1-2";
  if (householdSize <= 4) return "3-4";
  if (householdSize <= 6) return "5-6";
  return "7+";
}

function makeFamilySizeRows(requests: DistributionRequest[]): FamilySizeRow[] {
  return ["1-2", "3-4", "5-6", "7+"].map((size) => {
    const rows = requests.filter((request) => familyGroupForSize(request.householdSize) === size);
    return {
      approved: rows.filter((request) => activeStatuses.includes(request.status)).length,
      delivered: rows.filter((request) => request.status === "Delivered").length,
      denied: rows.filter((request) => request.status === "Denied").length,
      size,
    };
  });
}

export async function getDatabaseDashboardData(profile: AuthProfile): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const [seasonResult, driversResult, requestsResult, eventsResult] = await Promise.all([
    supabase.from("seasons").select("id,name,starts_on,ends_on,is_active").eq("is_active", true).maybeSingle(),
    supabase.from("driver_applications").select("user_id,name,phone,email,status").order("created_at", { ascending: false }),
    supabase.from("distribution_requests").select("*").order("created_at", { ascending: false }),
    supabase
      .from("delivery_events")
      .select("id,request_id,actor_id,event_type,from_status,to_status,notes,created_at")
      .order("created_at", { ascending: true }),
  ]);

  throwDatabaseError(seasonResult.error, "Unable to load the active season.");
  throwDatabaseError(driversResult.error, "Unable to load drivers.");
  throwDatabaseError(requestsResult.error, "Unable to load requests.");
  throwDatabaseError(eventsResult.error, "Unable to load delivery activity.");

  const drivers = (driversResult.data ?? []) as DriverRow[];
  const driverNames = new Map(drivers.map((driver) => [driver.user_id, driver.name]));
  const requestRows = (requestsResult.data ?? []) as RequestRow[];
  const activitiesByRequest = groupDeliveryActivity((eventsResult.data ?? []) as DeliveryEventRow[], driverNames);
  const activeSeasonId = (seasonResult.data as SeasonRow | null)?.id;
  const requests = requestRows
    .filter((request) => Boolean(activeSeasonId) && request.season_id === activeSeasonId)
    .map((request) => toRequest(request, driverNames, activitiesByRequest));
  const requestHistory = requestRows
    .filter((request) => !activeSeasonId || request.season_id !== activeSeasonId)
    .map((request) => toRequest(request, driverNames, activitiesByRequest));
  const ownApplication = drivers.find((driver) => driver.user_id === profile.userId);

  return {
    activeSeason: seasonResult.data ? toSeason(seasonResult.data as SeasonRow) : undefined,
    approvedDrivers: drivers.filter((driver) => driver.status === "approved").map(toDriver),
    currentDriverApplication: ownApplication ? { ...toDriver(ownApplication), status: ownApplication.status } : undefined,
    deniedDrivers: profile.role === "admin" ? drivers.filter((driver) => driver.status === "denied").map(toDriver) : [],
    familySizeRows: profile.role === "admin" ? makeFamilySizeRows(requests) : [],
    pendingDrivers: profile.role === "admin" ? drivers.filter((driver) => driver.status === "pending").map(toDriver) : [],
    requestHistory: profile.role === "admin" ? requestHistory : [],
    requests,
  };
}

export async function createDatabaseRequest(profile: AuthProfile, input: RequestInput) {
  const supabase = await createSupabaseServerClient();
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  throwDatabaseError(seasonError, "Unable to load the active season.");
  if (!season) throw new PublicError("Requests are closed because there is no active distribution season.");

  const { error } = await supabase.from("distribution_requests").insert({
    address: input.address,
    box_weight_lbs: Math.max(1, input.householdSize) * 7,
    email: input.email,
    household_size: input.householdSize,
    instructions: input.instructions,
    owner_id: profile.userId,
    phone: input.phone,
    recipient_name: input.recipient,
    season_id: season.id,
  });

  throwDatabaseError(error, "Unable to submit the request.", "This family already has a request for the active season.");
}

export async function setDatabaseRequestStatus(id: string, status: RequestStatus) {
  const supabase = await createSupabaseServerClient();
  const changes: { assigned_driver_id?: null; status: DatabaseRequestStatus } = { status: toDatabaseStatus[status] };
  const currentStatus = status === "Under review" ? "submitted" : "under_review";

  if (status === "Approved" || status === "Denied") changes.assigned_driver_id = null;

  const { data, error } = await supabase
    .from("distribution_requests")
    .update(changes)
    .eq("id", id)
    .eq("status", currentStatus)
    .select("id")
    .maybeSingle();
  throwDatabaseError(error, "Unable to update the request.");
  if (!data) throw new PublicError("This request has already moved to another status.");
}

export async function updateDatabaseRequestDetails(id: string, input: RequestEditInput) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("distribution_requests")
    .update({
      address: input.address,
      box_weight_lbs: input.boxWeightLbs,
      email: input.email,
      household_size: input.householdSize,
      instructions: input.instructions,
      phone: input.phone,
      recipient_name: input.recipient,
    })
    .eq("id", id)
    .in("status", ["submitted", "under_review"])
    .select("id")
    .maybeSingle();
  throwDatabaseError(error, "Unable to update the request details.");
  if (!data) throw new PublicError("Only submitted requests can be edited.");
}

export async function activateDatabaseSeason(input: SeasonInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("activate_season", {
    season_ends_on: input.endsOn,
    season_name: input.name,
    season_starts_on: input.startsOn,
  });
  throwDatabaseError(error, "Unable to activate the season.");
}

export async function claimDatabaseRequest(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("claim_delivery", { target_request_id: id });
  throwDatabaseError(error, "Unable to claim the delivery.");
}

export async function assignDatabaseRequest(id: string, driverId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("assign_delivery", { target_driver_id: driverId, target_request_id: id });
  throwDatabaseError(error, "Unable to assign the delivery.");
}

export async function unclaimDatabaseRequest(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("unclaim_delivery", { target_request_id: id });
  throwDatabaseError(error, "Unable to unclaim the delivery.");
}

export async function setDatabaseDeliveryStatus(id: string, status: RequestStatus) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_delivery_status", {
    next_status: toDatabaseStatus[status],
    target_request_id: id,
  });
  throwDatabaseError(error, "Unable to update the delivery.");
}

export async function createDatabaseDriverApplication(profile: AuthProfile, input: DriverApplicationInput) {
  const supabase = await createSupabaseServerClient();
  const existing = await supabase.from("driver_applications").select("status").eq("user_id", profile.userId).maybeSingle();
  throwDatabaseError(existing.error, "Unable to check the driver application.");

  const payload = { email: input.email, name: input.name, phone: input.phone, user_id: profile.userId };
  const result = existing.data?.status === "denied"
    ? await supabase
        .from("driver_applications")
        .update({ ...payload, reviewed_at: null, reviewed_by: null, status: "pending" })
        .eq("user_id", profile.userId)
    : await supabase.from("driver_applications").insert(payload);

  const { error } = result;
  throwDatabaseError(
    error,
    "Unable to submit the driver application.",
    "A driver application already exists for this email.",
  );
}

export async function resolveDatabaseDriverApplication(userId: string, decision: DriverApplicationDecision) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("driver_applications")
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: (await supabase.auth.getUser()).data.user?.id, status: decision })
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("user_id")
    .maybeSingle();
  throwDatabaseError(error, "Unable to resolve the driver application.");
  if (!data) throw new PublicError("This driver application has already been reviewed.");
}
