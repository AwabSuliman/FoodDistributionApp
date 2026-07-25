import "server-only";

import type { AuthProfile } from "./auth";
import { getSupabaseConfig } from "./auth";
import {
  assignDatabaseRequest,
  activateDatabaseSeason,
  bulkAssignDatabaseRequests,
  bulkApproveDatabaseDrivers,
  bulkSetDatabaseRequestStatus,
  claimDatabaseRequest,
  createDatabaseDriverApplication,
  createDatabaseRequest,
  getDatabaseDashboardData,
  markAllDatabaseNotificationsRead,
  markDatabaseNotificationRead,
  resolveDatabaseDriverApplication,
  setDatabaseRequestIntake,
  setDatabaseDeliveryStatus,
  setDatabaseRequestStatus,
  unclaimDatabaseRequest,
  updateDatabaseRequestDetails,
} from "./database";
import {
  assignRequest as assignFileRequest,
  claimRequest as claimFileRequest,
  createDriverApplication as createFileDriverApplication,
  createRequest as createFileRequest,
  getDashboardData as getFileDashboardData,
  markAllNotificationsRead as markAllFileNotificationsRead,
  markNotificationRead as markFileNotificationRead,
  resolvePendingDriver as resolveFilePendingDriver,
  setRequestStatus as setFileRequestStatus,
  updateRequestDetails as updateFileRequestDetails,
} from "./store";
import type { DriverApplicationDecision, DriverApplicationInput, RequestEditInput, RequestStatus, SeasonInput } from "./types";
import { PublicError } from "./errors";

type RequestInput = Parameters<typeof createFileRequest>[0];

export async function getDashboardData(profile: AuthProfile | null) {
  if (getSupabaseConfig() && profile) return getDatabaseDashboardData(profile);
  return getFileDashboardData();
}

export async function createRequest(profile: AuthProfile | null, input: RequestInput) {
  if (getSupabaseConfig()) {
    if (!profile) throw new PublicError("You must be signed in to submit a request.");
    return createDatabaseRequest(profile, input);
  }
  return createFileRequest(input);
}

export async function setRequestStatus(id: string, status: RequestStatus) {
  if (getSupabaseConfig()) return setDatabaseRequestStatus(id, status);
  return setFileRequestStatus(id, status);
}

export async function updateRequestDetails(id: string, input: RequestEditInput) {
  if (getSupabaseConfig()) return updateDatabaseRequestDetails(id, input);
  return updateFileRequestDetails(id, input);
}

export async function activateSeason(input: SeasonInput) {
  if (!getSupabaseConfig()) throw new PublicError("Connect Supabase before managing distribution seasons.");
  return activateDatabaseSeason(input);
}

export async function setRequestIntake(acceptingRequests: boolean) {
  if (!getSupabaseConfig()) throw new PublicError("Connect Supabase before managing request intake.");
  return setDatabaseRequestIntake(acceptingRequests);
}

export async function claimRequest(id: string, driver?: string) {
  if (getSupabaseConfig()) return claimDatabaseRequest(id);
  return claimFileRequest(id, driver);
}

export async function assignRequest(id: string, driverId: string) {
  if (getSupabaseConfig()) return assignDatabaseRequest(id, driverId);
  return assignFileRequest(id, driverId);
}

export async function bulkSetRequestStatus(ids: string[], status: RequestStatus) {
  if (getSupabaseConfig()) return bulkSetDatabaseRequestStatus(ids, status);

  for (const id of ids) {
    await setFileRequestStatus(id, status);
  }
}

export async function bulkAssignRequests(ids: string[], driverId: string) {
  if (getSupabaseConfig()) return bulkAssignDatabaseRequests(ids, driverId);

  for (const id of ids) {
    await assignFileRequest(id, driverId);
  }
}

export async function unclaimRequest(id: string) {
  if (getSupabaseConfig()) return unclaimDatabaseRequest(id);
  return setFileRequestStatus(id, "Approved");
}

export async function setDeliveryStatus(id: string, status: RequestStatus, note?: string) {
  if (getSupabaseConfig()) return setDatabaseDeliveryStatus(id, status, note);
  return setFileRequestStatus(id, status, note);
}

export async function createDriverApplication(profile: AuthProfile | null, input: DriverApplicationInput) {
  if (getSupabaseConfig()) {
    if (!profile) throw new PublicError("You must be signed in to apply as a driver.");
    return createDatabaseDriverApplication(profile, input);
  }
  return createFileDriverApplication(input);
}

export async function resolvePendingDriver(driverIdentifier: string, decision: DriverApplicationDecision) {
  if (getSupabaseConfig()) return resolveDatabaseDriverApplication(driverIdentifier, decision);
  return resolveFilePendingDriver(driverIdentifier, decision);
}

export async function bulkApproveDrivers(driverIdentifiers: string[]) {
  if (getSupabaseConfig()) return bulkApproveDatabaseDrivers(driverIdentifiers);

  for (const identifier of driverIdentifiers) {
    await resolveFilePendingDriver(identifier, "approved");
  }
}

export async function markNotificationRead(id: string) {
  if (getSupabaseConfig()) return markDatabaseNotificationRead(id);
  return markFileNotificationRead(id);
}

export async function markAllNotificationsRead() {
  if (getSupabaseConfig()) return markAllDatabaseNotificationsRead();
  return markAllFileNotificationsRead();
}
